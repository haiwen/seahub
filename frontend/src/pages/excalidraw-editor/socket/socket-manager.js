import { gestureDebug, stateDebug } from '../utils/debug';
import SocketClient from './socket-client';
import { CaptureUpdateAction, getSceneVersion, reconcileElements, restoreElements } from '@excalidraw/excalidraw';
import { CURSOR_SYNC_TIMEOUT, LOAD_IMAGES_TIMEOUT } from '../constants';
import throttle from 'lodash.throttle';
import { v4 as uuidv4 } from 'uuid';
import EventBus from '../utils/event-bus';
import FileManager from '../data/file-manager';
import { loadFilesFromServer, saveFilesToServer } from '../data/server-storage';
import { updateStaleImageStatuses } from '../utils/exdraw-utils';
import { isInitializedImageElement } from '../utils/element-utils';
import {
  OPERATION_TYPES,
  getActiveSessionType,
  getElementIdsFromAppState,
  getPointerDownElementIds,
  getPointerDownSessionType,
  isActiveSessionType,
  isPreviewOperationType,
} from '../utils/operation-type';

const PREVIEW_SYNC_TIMEOUT = 50;

const STATE = {
  IDLE: 'idle',
  SENDING: 'sending',
  CONFLICT: 'conflict',
  DISCONNECT: 'disconnect',
  NEED_RELOAD: 'need_reload',
};

class SocketManager {

  constructor(excalidrawAPI, document, config) {
    this.config = config;
    this.document = document;
    this.excalidrawAPI = excalidrawAPI;
    this.state = STATE.IDLE;

    this.pendingOperationList = [];
    this.pendingOperationBeginTimeList = [];
    this.activeGesture = null;
    this.remotePreviewSequenceByGesture = new Map();
    this.remotePreviewElementsById = new Map();
    this.isApplyingRemotePreview = false;
    this.pendingRemotePreviewChange = null;
    this.collaborators = new Map();
    const { user } = config;
    this.collaborators.set(user._username, user, { isCurrentUser: true });
    this.excalidrawAPI.updateScene({ collaborators: this.collaborators });

    this.eventBus = EventBus.getInstance();

    this.socketClient = new SocketClient(config);
    this.lastBroadcastedOrReceivedSceneVersion = 0; // used check is need sync or not
    if (document && document.elements) {
      this.setLastBroadcastedOrReceivedSceneVersion(document.elements);
    }
    this.lastQueuedSceneVersion = this.lastBroadcastedOrReceivedSceneVersion;
    this.fileManager = new FileManager({
      getFiles: async (ids) => {
        return loadFilesFromServer(ids);
      },
      saveFiles: async ({ addedFiles }) => {
        const { savedFiles, erroredFiles } = await saveFilesToServer(addedFiles);
        return {
          savedFiles: savedFiles.reduce((acc, id) => {
            const fileData = addedFiles.get(id);
            if (fileData) {
              acc.set(id, fileData);
            }
            return acc;
          }, new Map()),
          erroredFiles: erroredFiles.reduce((acc, id) => {
            const fileData = addedFiles.get(id);
            if (fileData) {
              acc.set(id, fileData);
            }
            return acc;
          }, new Map())
        };
      }
    });
  }

  updateUserInfo = (newUser) => {
    const collaborators = new Map(this.collaborators);
    this.config.user = newUser;
    collaborators.set(newUser._username, newUser, { isCurrentUser: true });
    this.collaborators = collaborators;

    this.excalidrawAPI.updateScene({ collaborators });
  };

  static getInstance = (excalidrawAPI, document, socketConfig) => {
    if (this.instance) {
      return this.instance;
    }

    if (!excalidrawAPI || !document || !socketConfig) {
      throw new Error('SocketManager init params is invalid. Place check your code to fix it.');
    }

    this.instance = new SocketManager(excalidrawAPI, document, socketConfig);
    return this.instance;
  };

  logGesture = (phase, gesture, extra = {}) => {
    if (!gesture) {
      return;
    }

    gestureDebug(`gesture ${phase}`, {
      gestureId: gesture.gestureId,
      type: gesture.type,
      phase,
      activeTool: gesture.activeTool,
      elementIds: gesture.elementIds,
      updateCount: gesture.updateCount,
      durationMs: Date.now() - gesture.startedAt,
      ...extra,
    });
  };

  startGesture = (activeTool, pointerDownState) => {
    if (this.activeGesture) {
      this.logGesture('cancel', this.activeGesture, { reason: 'new-pointer-down' });
    }

    const sceneElementIds = new Set(
      this.excalidrawAPI.getSceneElementsIncludingDeleted().map((element) => element.id),
    );
    this.activeGesture = {
      gestureId: uuidv4(),
      type: getPointerDownSessionType(activeTool, pointerDownState),
      activeTool: activeTool?.type || OPERATION_TYPES.OTHER,
      elementIds: getPointerDownElementIds(pointerDownState),
      sceneElementIds,
      startedAt: Date.now(),
      updateCount: 0,
      previewSequence: 0,
    };

    this.logGesture('start', this.activeGesture, {
      hitElementType: pointerDownState?.hit?.element?.type || null,
      isResizing: Boolean(pointerDownState?.resize?.isResizing),
    });
  };

  updateGesture = (elements, appState) => {
    const currentType = getActiveSessionType(elements, appState);

    // Text input can continue after pointerup. Start a logical text session
    // when Excalidraw exposes editingTextElement through onChange.
    if (!this.activeGesture && currentType === OPERATION_TYPES.EDIT_TEXT) {
      this.activeGesture = {
        gestureId: uuidv4(),
        type: currentType,
        activeTool: appState?.activeTool?.type || OPERATION_TYPES.OTHER,
        elementIds: getElementIdsFromAppState(appState),
        sceneElementIds: new Set(elements.map((element) => element.id)),
        startedAt: Date.now(),
        updateCount: 0,
        previewSequence: 0,
      };
      this.logGesture('start', this.activeGesture, { source: 'onChange' });
    }

    if (!this.activeGesture) {
      return { gesture: null, ended: false };
    }

    const previousType = this.activeGesture.type;
    if (
      isActiveSessionType(currentType) &&
      (previousType === OPERATION_TYPES.SELECTION || previousType === OPERATION_TYPES.OTHER)
    ) {
      this.activeGesture.type = currentType;
    }

    // Creating a text element transitions into a text editing session after
    // the pointer is released. Keep one gestureId for both phases.
    if (
      previousType === OPERATION_TYPES.CREATE_ELEMENT &&
      currentType === OPERATION_TYPES.EDIT_TEXT
    ) {
      this.activeGesture.type = OPERATION_TYPES.EDIT_TEXT;
    }

    if (this.activeGesture.type === OPERATION_TYPES.SELECTION && currentType === OPERATION_TYPES.DRAG) {
      this.activeGesture.type = OPERATION_TYPES.DRAG;
    }

    if (this.activeGesture.type === OPERATION_TYPES.SELECTION && currentType === OPERATION_TYPES.RESIZE) {
      this.activeGesture.type = OPERATION_TYPES.RESIZE;
    }

    let elementIds = getElementIdsFromAppState(appState);
    if (
      elementIds.length === 0 &&
      (this.activeGesture.type === OPERATION_TYPES.FREEDRAW ||
        this.activeGesture.type === OPERATION_TYPES.CREATE_ELEMENT)
    ) {
      elementIds = elements
        .filter((element) => !this.activeGesture.sceneElementIds?.has(element.id))
        .map((element) => element.id);
    }
    if (elementIds.length > 0) {
      this.activeGesture.elementIds = elementIds;
    }
    this.activeGesture.updateCount += 1;

    if (previousType !== this.activeGesture.type) {
      this.logGesture('transition', this.activeGesture, {
        from: previousType,
        to: this.activeGesture.type,
      });
    }

    this.logGesture('update', this.activeGesture, {
      currentType,
    });

    const gesture = this.activeGesture;
    const ended = gesture.type === OPERATION_TYPES.EDIT_TEXT && currentType === OPERATION_TYPES.OTHER;
    if (ended) {
      this.endGesture('text-edit-finished');
    }

    return { gesture, ended };
  };

  broadcastPreviewElements = throttle((elements, gesture) => {
    if (!gesture || !isPreviewOperationType(gesture.type)) {
      return;
    }

    const elementIds = new Set(gesture.elementIds);
    const previewElements = elementIds.size > 0
      ? elements.filter(element => elementIds.has(element.id))
      : [];
    if (previewElements.length === 0) {
      return;
    }

    gesture.previewSequence += 1;
    this.socketClient.broadcastPreviewElements({
      elements: previewElements,
      gestureId: gesture.gestureId,
      seq: gesture.previewSequence,
      type: gesture.type,
    });
  }, PREVIEW_SYNC_TIMEOUT);

  getPreviewUserKey = (user) => {
    return user?._username || user?.username || user?.id || 'unknown';
  };

  getSceneSignature = (elements) => {
    return elements.map((element) => `${element.id}:${element.version}:${element.versionNonce}:${element.isDeleted ? 1 : 0}`).join('|');
  };

  consumeRemotePreviewChange = (elements) => {
    if (this.isApplyingRemotePreview) {
      this.pendingRemotePreviewChange = null;
      return true;
    }

    if (!this.pendingRemotePreviewChange) {
      return false;
    }

    const isPreviewChange = this.pendingRemotePreviewChange.sceneSignature === this.getSceneSignature(elements);
    this.pendingRemotePreviewChange = null;
    return isPreviewChange;
  };

  getElementsWithoutRemotePreview = (elements) => {
    return elements.reduce((result, element) => {
      const previewRecord = this.remotePreviewElementsById.get(element.id);
      if (!previewRecord) {
        result.push(element);
      } else if (previewRecord.baseElement) {
        result.push(previewRecord.baseElement);
      }
      return result;
    }, []);
  };

  clearRemotePreviewRecords = (user, elementIds = null, gestureId = null) => {
    const userKey = user ? this.getPreviewUserKey(user) : null;
    const elementIdSet = elementIds ? new Set(elementIds) : null;

    for (const [elementId, previewRecord] of this.remotePreviewElementsById) {
      const isSameUser = !userKey || previewRecord.userKey === userKey;
      const isMatchingElement = !elementIdSet || elementIdSet.has(elementId);
      const isDifferentGesture = !gestureId || previewRecord.gestureId !== gestureId;
      if (isSameUser && isMatchingElement && isDifferentGesture) {
        this.remotePreviewElementsById.delete(elementId);
      }
    }
  };

  handleRemotePreviewElements = (params) => {
    const { gestureId, seq, type, user, elements = [] } = params;
    if (!gestureId || !Number.isFinite(seq) || !Array.isArray(elements)) {
      return;
    }

    const userKey = this.getPreviewUserKey(user);
    const previewKey = `${userKey}:${gestureId}`;
    const lastSeq = this.remotePreviewSequenceByGesture.get(previewKey);
    if (lastSeq !== undefined && seq <= lastSeq) {
      return;
    }

    if (!this.remotePreviewSequenceByGesture.has(previewKey) && this.remotePreviewSequenceByGesture.size >= 100) {
      const oldestPreviewKey = this.remotePreviewSequenceByGesture.keys().next().value;
      this.remotePreviewSequenceByGesture.delete(oldestPreviewKey);
    }
    this.remotePreviewSequenceByGesture.set(previewKey, seq);

    // A user can only have one active gesture. Remove an older gesture's
    // temporary elements before applying the latest preview.
    this.clearRemotePreviewRecords(user, null, gestureId);

    const localElements = this.excalidrawAPI.getSceneElementsIncludingDeleted();
    const sceneElements = this.getElementsWithoutRemotePreview(localElements);
    const previewElements = restoreElements(elements, null);
    const sceneElementById = new Map(sceneElements.map(element => [element.id, element]));
    const previewElementById = new Map(previewElements.map(element => [element.id, element]));

    previewElementById.forEach((previewElement, elementId) => {
      const previousRecord = this.remotePreviewElementsById.get(elementId);
      this.remotePreviewElementsById.set(elementId, {
        userKey,
        gestureId,
        type,
        element: previewElement,
        baseElement: previousRecord?.baseElement || sceneElementById.get(elementId) || null,
      });
      sceneElementById.set(elementId, previewElement);
    });

    const nextSceneElements = Array.from(sceneElementById.values());
    // updateScene() schedules Excalidraw's onChange. Keep a scene signature so
    // the later callback can be identified without swallowing a real local
    // edit that happened in the meantime.
    this.pendingRemotePreviewChange = {
      sceneSignature: this.getSceneSignature(nextSceneElements),
    };
    this.isApplyingRemotePreview = true;
    try {
      this.excalidrawAPI.updateScene({
        elements: nextSceneElements,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    } finally {
      this.isApplyingRemotePreview = false;
    }

    gestureDebug('apply preview', {
      gestureId,
      type,
      seq,
      user: userKey,
      elementIds: previewElements.map(element => element.id),
    });
  };

  endGesture = (reason = 'pointer-up') => {
    if (!this.activeGesture) {
      return;
    }

    this.logGesture('end', this.activeGesture, { reason });
    this.activeGesture = null;
  };

  commitGesture = (elements, gesture = this.activeGesture, reason = 'pointer-up') => {
    if (!gesture) {
      return false;
    }

    // Ensure the final Preview is sent before the reliable commit. The
    // throttle may still have a trailing update waiting to be dispatched.
    this.broadcastPreviewElements.flush();
    if (this.activeGesture === gesture) {
      this.endGesture(reason);
    }
    this.syncLocalElementsToOthers(elements);
    return true;
  };

  handlePointerDown = (activeTool, pointerDownState) => {
    this.startGesture(activeTool, pointerDownState);
  };

  handlePointerUp = (activeTool, pointerDownState) => {
    if (!this.activeGesture) {
      return;
    }

    const elements = this.excalidrawAPI.getSceneElementsIncludingDeleted();
    const appState = this.excalidrawAPI.getAppState();
    const currentType = getActiveSessionType(elements, appState);
    const previousType = this.activeGesture.type;
    if (currentType === OPERATION_TYPES.EDIT_TEXT && previousType !== currentType) {
      this.activeGesture.type = currentType;
      this.logGesture('transition', this.activeGesture, {
        from: previousType,
        to: currentType,
      });
    }
    this.logGesture('pointer-up', this.activeGesture, {
      currentType,
      activeTool: activeTool?.type || this.activeGesture.activeTool,
      hitElementType: pointerDownState?.hit?.element?.type || null,
    });

    // Text editing continues after the pointer is released and is committed
    // by the onChange that observes editingTextElement becoming null.
    if (currentType !== OPERATION_TYPES.EDIT_TEXT) {
      this.commitGesture(elements, this.activeGesture);
    }
  };

  getVersion = () => {
    return this.document.version;
  };

  setVersion = (version) => {
    this.document.version = version;
  };

  setLastBroadcastedOrReceivedSceneVersion = (elements) => {
    const version = getSceneVersion(elements);
    this.lastBroadcastedOrReceivedSceneVersion = version;
  };

  getLastBroadcastedOrReceivedSceneVersion = () => {
    return this.lastBroadcastedOrReceivedSceneVersion;
  };

  fetchImageFilesFromServer = async (opts) => {
    const elements = opts.elements.filter(element => {
      return (
        isInitializedImageElement(element) &&
          !this.fileManager.isFileTracked(element.fileId) &&
          !element.isDeleted &&
          (opts.forceFetchFiles ? element.status !== 'pending' || Date.now() - element.updated > 10000 : element.status === 'saved')
      );
    });

    return await this.fileManager.getFiles(elements);
  };

  loadImageFiles = throttle(async () => {
    const { loadedFiles, erroredFiles } =
        await this.fetchImageFilesFromServer({
          elements: this.excalidrawAPI.getSceneElementsIncludingDeleted(),
        });

    this.excalidrawAPI.addFiles(loadedFiles);

    updateStaleImageStatuses({
      excalidrawAPI: this.excalidrawAPI,
      erroredFiles,
      elements: this.excalidrawAPI.getSceneElementsIncludingDeleted(),
    });
  }, LOAD_IMAGES_TIMEOUT);

  isNeedToSync = (elements) => {
    const currentVersion = getSceneVersion(elements);
    if (currentVersion > this.lastBroadcastedOrReceivedSceneVersion) {
      return true;
    }
    return false;
  };

  syncLocalElementsToOthers = (elements) => {
    const elementsWithoutRemotePreview = this.getElementsWithoutRemotePreview(elements);
    const sceneVersion = getSceneVersion(elementsWithoutRemotePreview);
    if (sceneVersion <= this.lastQueuedSceneVersion || !this.isNeedToSync(elementsWithoutRemotePreview)) {
      return;
    }
    this.lastQueuedSceneVersion = sceneVersion;
    this.pendingOperationList.push(elementsWithoutRemotePreview);

    const lastOpBeginTime = new Date().getTime();
    this.pendingOperationBeginTimeList.push(lastOpBeginTime);
    const firstOpBeginTime = this.pendingOperationBeginTimeList[0];

    const isExceedExecuteTime = (lastOpBeginTime - firstOpBeginTime) / 1000 > 30 ? true : false;
    if (isExceedExecuteTime || this.pendingOperationList.length > 500) {
      this.dispatchConnectState('pending_operations_exceed_limit');
    }

    this.sendOperations();
  };

  sendOperations = () => {
    if (this.state !== STATE.IDLE) return;
    stateDebug(`State changed: ${this.state} -> ${STATE.SENDING}`);
    this.state = STATE.SENDING;
    this.sendNextOperations();
  };

  sendNextOperations = () => {
    if (this.state !== STATE.SENDING) return;
    if (this.pendingOperationList.length === 0) {
      stateDebug(`State Changed: ${this.state} -> ${STATE.IDLE}`);
      this.state = STATE.IDLE;
      return;
    }

    this.dispatchConnectState('is-saving');
    const version = this.document.version;
    const elements = this.pendingOperationList.shift();
    this._sendingOperation = elements;

    this.socketClient.broadcastSceneElements(elements, version, this.sendOperationsCallback);
  };

  sendOperationsCallback = (result) => {
    if (result && result.success) {
      const { version: serverVersion } = result;
      this.setVersion(serverVersion);
      const lastSavedAt = new Date().getTime();
      this.dispatchConnectState('saved', lastSavedAt);

      this.setLastBroadcastedOrReceivedSceneVersion(this._sendingOperation);

      // send next operations
      this.pendingOperationBeginTimeList.shift(); // remove current operation's begin time
      this._sendingOperation = null;
      this.sendNextOperations();
      return;
    }
    // Operations are execute failure
    const { error_type } = result;
    if (error_type === 'load_document_content_error' || error_type === 'token_expired') {
      // load_document_content_error: After a short-term reconnection, the content of the document fails to load
      this.dispatchConnectState(error_type);

      // reset sending control
      stateDebug(`State Changed: ${this.state} -> ${STATE.NEED_RELOAD}`);
      this.state = STATE.NEED_RELOAD;
      this._sendingOperation = null;
    } else if (error_type === 'version_behind_server') {
      // Put the failed operation into the pending list and re-execute it
      this.pendingOperationList.unshift(this._sendingOperation);

      stateDebug(`State Changed: ${this.state} -> ${STATE.CONFLICT}`);
      this.state = STATE.CONFLICT;
      this.resolveConflicting(result);
    }
  };

  resolveConflicting = (result) => {
    const { elements, version } = result;

    this.updateLocalDataByRemoteData(elements, version);

    this.pendingOperationBeginTimeList.shift();
    this._sendingOperation = null;
    this.state = STATE.SENDING;
    this.sendNextOperations();
  };


  syncMouseLocationToOthers = throttle((payload) => {
    if (payload.pointersMap.size < 2) {
      const { pointer, button } = payload;
      this.socketClient.broadcastMouseLocation({ pointer, button });
    }
  }, CURSOR_SYNC_TIMEOUT);

  updateLocalDataByRemoteData = (remoteElements, remoteVersion) => {
    this.pendingRemotePreviewChange = null;
    const localElements = this.getElementsWithoutRemotePreview(
      this.excalidrawAPI.getSceneElementsIncludingDeleted(),
    );
    const appState = this.excalidrawAPI.getAppState();
    const restoredRemoteElements = restoreElements(remoteElements, null);
    const reconciledElements = reconcileElements(localElements, restoredRemoteElements, appState);

    this.setLastBroadcastedOrReceivedSceneVersion(reconciledElements);
    this.lastQueuedSceneVersion = Math.max(
      this.lastQueuedSceneVersion,
      getSceneVersion(reconciledElements),
    );
    this.setVersion(remoteVersion);

    this.excalidrawAPI.updateScene({
      elements: reconciledElements,
      captureUpdate: CaptureUpdateAction.NEVER,
    });

    // sync images from another user
    this.loadImageFiles();
  };

  handleRemoteSceneUpdated = (params) => {
    const { elements, version, user } = params;
    const elementIds = Array.isArray(elements) ? elements.map(element => element.id) : [];
    this.clearRemotePreviewRecords(user, elementIds);
    this.updateLocalDataByRemoteData(elements, version);
  };

  handleRemoteMouseLocationUpdated = (params) => {
    const collaborators = new Map(this.collaborators);
    const { user, ...updates } = params;
    if (!collaborators.get(user._username)) return;

    const newUser = Object.assign({}, collaborators.get(user._username), { ...updates, username: user.username });
    collaborators.set(newUser._username, newUser);
    this.collaborators = collaborators;

    this.excalidrawAPI.updateScene({ collaborators });
    return;
  };

  receiveRoomUserChanged = (users) => {
    const collaborators = new Map(this.collaborators);
    if (users && Array.isArray(users)) {
      users.forEach(user => {
        if (!collaborators.get(user._username)) {
          collaborators.set(user._username, user);
        }
      });
      this.collaborators = collaborators;
      setTimeout(() => {
        this.excalidrawAPI.updateScene({ collaborators });
      }, 100);
    }
  };

  receiveLeaveRoom = (userInfo) => {
    const collaborators = new Map(this.collaborators);
    if (collaborators.get(userInfo._username)) {
      collaborators.delete(userInfo._username);
      this.collaborators = collaborators;
      this.excalidrawAPI.updateScene({ collaborators });
    }
  };

  dispatchConnectState = (type, message) => {
    if (type === 'reconnect') {
      this.state = STATE.IDLE;
      if (this.pendingOperationList.length > 0) {
        this.sendOperations();
      }
    }

    if (type === 'disconnect') {
      // current state is sending
      if (this._sendingOperation) {
        this.pendingOperationList.unshift(this._sendingOperation);
        this._sendingOperation = null;
      }
      stateDebug(`State Changed: ${this.state} -> ${STATE.DISCONNECT}`);
      this.state = STATE.DISCONNECT;
    }

    this.eventBus.dispatch(type, message);
  };

  static destroy = () => {
    if (this.instance?.socketClient) {
      this.instance.socketClient.close();
    }
    this.instance = null;
  };

}

export default SocketManager;

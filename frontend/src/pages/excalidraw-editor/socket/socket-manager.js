import { CaptureUpdateAction, getSceneVersion, reconcileElements, restoreElements } from '@excalidraw/excalidraw';
import throttle from 'lodash.throttle';
import { CURSOR_SYNC_TIMEOUT, LOAD_IMAGES_TIMEOUT, PREVIEW_COMMIT_DELAY } from '../constants';
import FileManager from '../data/file-manager';
import { loadFilesFromServer, saveFilesToServer } from '../data/server-storage';
import { stateDebug } from '../utils/debug';
import { isInitializedImageElement } from '../utils/element-utils';
import EventBus from '../utils/event-bus';
import { updateStaleImageStatuses } from '../utils/exdraw-utils';
import SocketClient from './socket-client';

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
    this._sendingOperation = null;
    this._sendingOperationCallback = null;
    this.previewElements = null;
    this.lastObservedElementVersions = null;
    this.previewCommitTimer = null;
    this.pendingRemoteUpdates = [];
    this.remoteRenderFrame = null;
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

  updatePreview = (elements) => {
    const previousElements = this.lastObservedElementVersions;
    // App-state-only changes must not restart the pending commit timer.
    if (previousElements && previousElements.length === elements.length && elements.every((element, index) => {
      const previousElement = previousElements[index];
      return element.id === previousElement.id && element.version === previousElement.version &&
        element.versionNonce === previousElement.versionNonce;
    })) {
      return;
    }
    // Store scalar snapshots because Excalidraw can mutate elements in place.
    this.lastObservedElementVersions = elements.map(({ id, version, versionNonce }) => ({ id, version, versionNonce }));

    if (!this.previewElements && !this.hasUnsyncedSceneChanges(elements)) {
      return;
    }

    this.previewElements = elements;
    clearTimeout(this.previewCommitTimer);
    this.previewCommitTimer = setTimeout(() => {
      this.commitPreview();
    }, PREVIEW_COMMIT_DELAY);
  };

  commitPreview = () => {
    clearTimeout(this.previewCommitTimer);
    this.previewCommitTimer = null;

    if (!this.previewElements) {
      return;
    }

    let elements = this.previewElements;
    this.previewElements = null;

    if (this.pendingRemoteUpdates.length > 0) {
      const mergedRemoteScene = this.applyRemoteSceneUpdates(this.pendingRemoteUpdates, elements);
      this.pendingRemoteUpdates = [];
      elements = mergedRemoteScene.elements;
      this.setVersion(mergedRemoteScene.version);
      this.setLastBroadcastedOrReceivedSceneVersion(elements);
      this.excalidrawAPI.updateScene({
        elements,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      this.loadImageFiles();
    }

    this.syncLocalElementsToOthers(elements, true);
  };

  enqueueRemoteSceneUpdate = (elements, version) => {
    if (!Array.isArray(elements)) {
      return;
    }

    const normalizedVersion = Number.isFinite(Number(version)) ? Number(version) : this.getVersion();
    this.pendingRemoteUpdates.push({
      elements,
      version: normalizedVersion,
      editingTextElementId: this.excalidrawAPI.getAppState().editingTextElement?.id,
    });
    this.pendingRemoteUpdates.sort((left, right) => left.version - right.version);

    // Advance the scene baseline only when applying updates; local edits may
    // arrive before the scheduled render and must still enter the preview queue.
    this.setVersion(Math.max(this.getVersion(), normalizedVersion));

    if (!this.previewElements) {
      this.scheduleRemoteSceneRender();
    }
  };

  scheduleRemoteSceneRender = () => {
    if (this.remoteRenderFrame !== null) {
      return;
    }

    const render = () => {
      this.remoteRenderFrame = null;
      this.flushRemoteSceneUpdates();
    };

    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      this.remoteRenderFrame = window.requestAnimationFrame(render);
      return;
    }

    this.remoteRenderFrame = setTimeout(render, 0);
  };

  cancelRemoteSceneRender = () => {
    if (this.remoteRenderFrame === null) {
      return;
    }

    if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
      window.cancelAnimationFrame(this.remoteRenderFrame);
    } else {
      clearTimeout(this.remoteRenderFrame);
    }
    this.remoteRenderFrame = null;
  };

  applyRemoteSceneUpdates = (updates, baseElements = null) => {
    let localElements = baseElements || this.excalidrawAPI.getSceneElementsIncludingDeleted();
    const appState = this.excalidrawAPI.getAppState();
    let remoteVersion = this.getVersion();

    updates.forEach((update) => {
      let restoredRemoteElements = restoreElements(update.elements, null);
      if (update.editingTextElementId) {
        const protectedTextElement = localElements.find(element => element.id === update.editingTextElementId);
        if (protectedTextElement) {
          // Keep receive-time protection after editing ends, using the latest local text.
          restoredRemoteElements = restoredRemoteElements.map(element => (
            element.id === protectedTextElement.id ? protectedTextElement : element
          ));
        }
      }
      localElements = reconcileElements(localElements, restoredRemoteElements, appState);
      remoteVersion = Math.max(remoteVersion, update.version);
    });

    return {
      elements: localElements,
      version: remoteVersion,
    };
  };

  flushRemoteSceneUpdates = () => {
    if (this.previewElements || this.pendingRemoteUpdates.length === 0) {
      return;
    }

    const updates = this.pendingRemoteUpdates;
    this.pendingRemoteUpdates = [];
    const mergedRemoteScene = this.applyRemoteSceneUpdates(updates);

    this.setLastBroadcastedOrReceivedSceneVersion(mergedRemoteScene.elements);
    this.setVersion(mergedRemoteScene.version);
    this.excalidrawAPI.updateScene({
      elements: mergedRemoteScene.elements,
      captureUpdate: CaptureUpdateAction.NEVER,
    });

    this.loadImageFiles();
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

  hasUnsyncedSceneChanges = (elements) => {
    // Compare scene versions against the sync baseline, not the document version.
    const currentSceneVersion = getSceneVersion(elements);
    return currentSceneVersion > this.lastBroadcastedOrReceivedSceneVersion;
  };

  syncLocalElementsToOthers = (elements, force = false) => {
    if (!force && !this.hasUnsyncedSceneChanges(elements)) {
      return;
    }
    const operation = {
      elements,
      createAt: Date.now(),
    };
    this.pendingOperationList.push(operation);

    const firstOperation = this._sendingOperation || this.pendingOperationList[0];
    const isExceedExecuteTime = operation.createAt - firstOperation.createAt > 30 * 1000;
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

    const operation = this.pendingOperationList.shift();
    this._sendingOperation = operation;
    const callback = (result) => {
      // Acknowledgements from an earlier attempt must not affect a retry.
      if (this._sendingOperationCallback !== callback) return;
      this.sendOperationsCallback(result);
    };
    this._sendingOperationCallback = callback;

    try {
      this.dispatchConnectState('is-saving');
      this.socketClient.broadcastSceneElements(operation.elements, this.getVersion(), callback);
    } catch (error) {
      if (this._sendingOperationCallback === callback) {
        this.handleOperationError(error);
      }
    }
  };

  sendOperationsCallback = (result) => {
    if (!this._sendingOperation || this.state !== STATE.SENDING) return;

    try {
      if (!result?.success || !Number.isFinite(result.version)) {
        this.handleOperationError(result);
        return;
      }

      this.setVersion(Math.max(this.getVersion(), result.version));
      this.setLastBroadcastedOrReceivedSceneVersion(this._sendingOperation.elements);
      this._sendingOperation = null;
      this._sendingOperationCallback = null;
      this.dispatchConnectState('saved', Date.now());
      this.sendNextOperations();
    } catch (error) {
      this.handleOperationError(error);
    }
  };

  requeueSendingOperation = () => {
    if (this._sendingOperation) {
      this.pendingOperationList.unshift(this._sendingOperation);
      this._sendingOperation = null;
    }
    this._sendingOperationCallback = null;
  };

  handleOperationError = (error) => {
    stateDebug('Operation failed: %O', error);
    this.requeueSendingOperation();

    const errorType = error?.error_type;
    if (errorType === 'version_behind_server' && Array.isArray(error.elements) && Number.isFinite(error.version)) {
      stateDebug(`State Changed: ${this.state} -> ${STATE.CONFLICT}`);
      this.state = STATE.CONFLICT;
      try {
        this.resolveConflicting(error);
      } catch (conflictError) {
        this.handleOperationError(conflictError);
      }
      return;
    }

    stateDebug(`State Changed: ${this.state} -> ${STATE.NEED_RELOAD}`);
    this.state = STATE.NEED_RELOAD;
    const eventType = errorType === 'load_document_content_error' || errorType === 'token_expired'
      ? errorType : 'sync_server_operations_error';
    this.dispatchConnectState(eventType);
  };

  resolveConflicting = ({ elements, version }) => {
    this.updateLocalDataByRemoteData(elements, version);
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
    if (this.previewElements) {
      this.enqueueRemoteSceneUpdate(remoteElements, remoteVersion);
      return;
    }

    const mergedRemoteScene = this.applyRemoteSceneUpdates([{
      elements: remoteElements,
      version: remoteVersion,
    }]);

    this.setLastBroadcastedOrReceivedSceneVersion(mergedRemoteScene.elements);
    this.setVersion(mergedRemoteScene.version);

    this.excalidrawAPI.updateScene({
      elements: mergedRemoteScene.elements,
      captureUpdate: CaptureUpdateAction.NEVER,
    });

    // sync images from another user
    this.loadImageFiles();
  };

  handleRemoteSceneUpdated = (params) => {
    const { elements, version } = params;
    this.enqueueRemoteSceneUpdate(elements, version);
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
    if (this.state === STATE.NEED_RELOAD && (type === 'reconnect' || type === 'disconnect')) {
      return;
    }

    if (type === 'reconnect') {
      this.state = STATE.IDLE;
      if (this.pendingOperationList.length > 0) {
        this.sendOperations();
      }
    }

    if (type === 'disconnect') {
      stateDebug(`State Changed: ${this.state} -> ${STATE.DISCONNECT}`);
      this.state = STATE.DISCONNECT;
      this.requeueSendingOperation();
      this.commitPreview();
    }

    this.eventBus.dispatch(type, message);
  };

  static destroy = () => {
    if (this.instance?.socketClient) {
      this.instance.commitPreview();
      this.instance.cancelRemoteSceneRender();
      this.instance.socketClient.close();
    }
    this.instance = null;
  };

}

export default SocketManager;

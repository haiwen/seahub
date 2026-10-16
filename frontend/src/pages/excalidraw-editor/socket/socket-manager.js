import { CaptureUpdateAction, getSceneVersion, reconcileElements, restoreElements } from '@excalidraw/excalidraw';
import throttle from 'lodash.throttle';
import { v4 as uuidv4 } from 'uuid';
import { CURSOR_SYNC_TIMEOUT, LOAD_IMAGES_TIMEOUT, MAX_OPERATION_RETRIES, OPERATION_RETRY_DELAY, PREVIEW_COMMIT_DELAY } from '../constants';
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
    this._sendingAttempt = null;
    this.operationRetryTimer = null;
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
      operation_id: uuidv4(),
      elements,
      createdAt: Date.now(),
      retryCount: 0,
    };
    this.pendingOperationList.push(operation);

    const oldestOperation = this._sendingOperation || this.pendingOperationList[0];
    const isExceedExecuteTime = operation.createdAt - oldestOperation.createdAt > 30000;
    if (isExceedExecuteTime || this.pendingOperationList.length > 500) {
      this.dispatchConnectState('pending_operations_exceed_limit');
    }

    this.sendOperations();
  };

  sendOperations = () => {
    if (this.state !== STATE.IDLE || this.operationRetryTimer !== null) return;
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
    // The operation id survives retries; each send has a separate identity.
    const attempt = { sceneVersion: getSceneVersion(operation.elements) };
    this._sendingOperation = operation;
    this._sendingAttempt = attempt;
    this.dispatchConnectState('is-saving');

    this.socketClient.broadcastSceneElements(
      operation,
      this.document.version,
      (result) => this.sendOperationsCallback(result, operation.operation_id, attempt),
      () => this._sendingOperation === operation && this._sendingAttempt === attempt,
    );
  };

  sendOperationsCallback = (result, operationId, attempt) => {
    const operation = this._sendingOperation;
    if (!operation || operation.operation_id !== operationId || this._sendingAttempt !== attempt) {
      return;
    }
    this._sendingAttempt = null;

    const ackOperationId = result?.operation_id ?? result?.operationId;
    if (ackOperationId != null && ackOperationId !== operationId) {
      this.handleOperationError({ error_type: 'sync_server_operations_error' });
      return;
    }

    if (result?.success && Number.isFinite(result.version)) {
      this.setVersion(Math.max(this.getVersion(), result.version));
      // Confirm the scene that was sent, not elements mutated while awaiting ACK.
      this.lastBroadcastedOrReceivedSceneVersion = Math.max(
        this.lastBroadcastedOrReceivedSceneVersion, attempt.sceneVersion,
      );
      this._sendingOperation = null;
      this.dispatchConnectState('saved', Date.now());
      this.sendNextOperations();
      return;
    }
    this.handleOperationError(result);
  };

  handleOperationError = (result) => {
    const errorType = result?.error_type;
    switch (errorType) {
      case 'load_document_content_error':
      case 'token_expired':
        this.requeueSendingOperation();
        this.state = STATE.NEED_RELOAD;
        this.dispatchConnectState(errorType);
        return;
      case 'version_behind_server':
        if (Array.isArray(result.elements) && Number.isFinite(result.version)) {
          this.requeueSendingOperation();
          this.state = STATE.CONFLICT;
          this.resolveConflicting(result);
          return;
        }
        break;
      default:
        break;
    }
    this.retrySendingOperation(errorType || 'sync_server_operations_error');
  };

  retrySendingOperation = (errorType) => {
    const operation = this._sendingOperation;
    this.requeueSendingOperation();

    if (operation.retryCount >= MAX_OPERATION_RETRIES) {
      // Retain unconfirmed edits rather than silently discarding them.
      this.state = STATE.NEED_RELOAD;
      this.dispatchConnectState('sync_server_operations_error');
      return;
    }

    operation.retryCount += 1;
    stateDebug(`Operation failed (${errorType}); retry ${operation.retryCount}.`);
    this.state = STATE.IDLE;
    this.operationRetryTimer = setTimeout(() => {
      this.operationRetryTimer = null;
      this.sendOperations();
    }, OPERATION_RETRY_DELAY);
  };

  requeueSendingOperation = () => {
    // Invalidate first, so late ACKs and repeated disconnects cannot reuse it.
    this._sendingAttempt = null;
    const operation = this._sendingOperation;
    this._sendingOperation = null;
    if (operation) {
      this.pendingOperationList.unshift(operation);
    }
  };

  resolveConflicting = (result) => {
    const { elements, version } = result;
    this.updateLocalDataByRemoteData(elements, version);
    if (this.state !== STATE.CONFLICT) return;
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
    if (type === 'reconnect') {
      if (this.state === STATE.NEED_RELOAD) return;
      if (this.state === STATE.DISCONNECT) {
        this.state = STATE.IDLE;
        this.sendOperations();
      }
    }

    if (type === 'disconnect') {
      clearTimeout(this.operationRetryTimer);
      this.operationRetryTimer = null;
      // Stop sends before committing any outstanding local preview.
      if (this.state !== STATE.NEED_RELOAD) {
        this.state = STATE.DISCONNECT;
      }
      this.requeueSendingOperation();
      this.commitPreview();
    }

    this.eventBus.dispatch(type, message);
  };

  static destroy = () => {
    if (this.instance?.socketClient) {
      const manager = this.instance;
      manager.state = STATE.NEED_RELOAD;
      manager.requeueSendingOperation();
      clearTimeout(manager.operationRetryTimer);
      manager.operationRetryTimer = null;
      manager.commitPreview();
      manager.cancelRemoteSceneRender();
      manager.socketClient.close();
    }
    this.instance = null;
  };

}

export default SocketManager;

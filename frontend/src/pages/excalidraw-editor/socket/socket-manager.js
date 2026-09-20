import { CaptureUpdateAction, getSceneVersion, reconcileElements, restoreElements } from '@excalidraw/excalidraw';
import throttle from 'lodash.throttle';
import { v4 as uuidv4 } from 'uuid';
import { CURSOR_SYNC_TIMEOUT, LOAD_IMAGES_TIMEOUT, OPERATION_RETRY_DELAY, PREVIEW_COMMIT_DELAY } from '../constants';
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
    this.previewElements = null;
    this.previewCommitTimer = null;
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
    if (!this.previewElements && !this.isNeedToSync(elements)) {
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

    const elements = this.previewElements;
    this.previewElements = null;
    this.syncLocalElementsToOthers(elements, true);
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

  syncLocalElementsToOthers = (elements, force = false) => {
    if (!force && !this.isNeedToSync(elements)) {
      return;
    }
    const operation = {
      operation_id: uuidv4(),
      elements,
      createdAt: Date.now(),
    };
    this.pendingOperationList.push(operation);

    const oldestOperation = this._sendingOperation || this.pendingOperationList[0];
    const isExceedExecuteTime = oldestOperation
      && (operation.createdAt - oldestOperation.createdAt) / 1000 > 30;
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
    const operation = this.pendingOperationList.shift();
    this._sendingOperation = operation;

    this.socketClient.broadcastSceneElements(
      operation.elements,
      version,
      operation.operation_id,
      (result) => this.sendOperationsCallback(result, operation.operation_id),
    );
  };

  sendOperationsCallback = (result, operation_id) => {
    const currentOperation = this._sendingOperation;
    if (!currentOperation || currentOperation.operation_id !== operation_id) {
      return;
    }

    const ack_operation_id = result?.operation_id || result?.operationId;
    if (ack_operation_id && ack_operation_id !== operation_id) {
      return;
    }

    if (result && result.success) {
      const { version: serverVersion } = result;
      this.setVersion(serverVersion);
      const lastSavedAt = new Date().getTime();
      this.dispatchConnectState('saved', lastSavedAt);

      this.setLastBroadcastedOrReceivedSceneVersion(currentOperation.elements);

      // send next operations
      this._sendingOperation = null;
      this.sendNextOperations();
      return;
    }
    this.handleOperationError(result);
  };

  handleOperationError = (result) => {
    const { error_type } = result || {};

    switch (error_type) {
      case 'ack_timeout':
        this.requeueSendingOperation();

        stateDebug(`ACK timeout. State Changed: ${this.state} -> ${STATE.IDLE}`);
        this.state = STATE.IDLE;
        this.dispatchConnectState('ack_timeout');
        setTimeout(() => this.sendOperations(), OPERATION_RETRY_DELAY);
        return;
      case 'load_document_content_error':
      case 'token_expired':
        // load_document_content_error: After a short-term reconnection, the content of the document fails to load
        this.dispatchConnectState(error_type);

        stateDebug(`State Changed: ${this.state} -> ${STATE.NEED_RELOAD}`);
        this.state = STATE.NEED_RELOAD;
        this._sendingOperation = null;
        return;
      case 'version_behind_server':
        // Put the failed operation into the pending list and re-execute it
        this.pendingOperationList.unshift(this._sendingOperation);

        stateDebug(`State Changed: ${this.state} -> ${STATE.CONFLICT}`);
        this.state = STATE.CONFLICT;
        this.resolveConflicting(result);
        return;
      default:
        return;
    }
  };

  resolveConflicting = (result) => {
    const { elements, version } = result;

    this.updateLocalDataByRemoteData(elements, version);

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
    if (this.previewElements) {
      if (Array.isArray(remoteElements)) {
        this.setLastBroadcastedOrReceivedSceneVersion(remoteElements);
      }
      this.setVersion(remoteVersion);
      return;
    }

    const localElements = this.excalidrawAPI.getSceneElementsIncludingDeleted();
    const appState = this.excalidrawAPI.getAppState();
    const restoredRemoteElements = restoreElements(remoteElements, null);
    const reconciledElements = reconcileElements(localElements, restoredRemoteElements, appState);

    this.setLastBroadcastedOrReceivedSceneVersion(reconciledElements);
    this.setVersion(remoteVersion);

    this.excalidrawAPI.updateScene({
      elements: reconciledElements,
      captureUpdate: CaptureUpdateAction.NEVER,
    });

    // sync images from another user
    this.loadImageFiles();
  };

  handleRemoteSceneUpdated = (params) => {
    const { elements, version } = params;
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

  requeueSendingOperation = () => {
    if (!this._sendingOperation) {
      return;
    }

    // Clear the in-flight reference before re-queueing so repeated disconnect
    // events cannot enqueue the same operation more than once.
    const sendingOperation = this._sendingOperation;
    this._sendingOperation = null;
    this.pendingOperationList.unshift(sendingOperation);
  };

  dispatchConnectState = (type, message) => {
    if (type === 'reconnect') {
      this.state = STATE.IDLE;
      if (this.pendingOperationList.length > 0) {
        this.sendOperations();
      }
    }

    if (type === 'disconnect') {
      this.commitPreview();
      this.requeueSendingOperation();
      stateDebug(`State Changed: ${this.state} -> ${STATE.DISCONNECT}`);
      this.state = STATE.DISCONNECT;
    }

    this.eventBus.dispatch(type, message);
  };

  static destroy = () => {
    if (this.instance?.socketClient) {
      this.instance.commitPreview();
      this.instance.socketClient.close();
    }
    this.instance = null;
  };

}

export default SocketManager;

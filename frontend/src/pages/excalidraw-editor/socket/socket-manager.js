import { v4 as uuidv4 } from 'uuid';
import { stateDebug } from '../utils/debug';
import SocketClient from './socket-client';
import { CaptureUpdateAction, getSceneVersion, reconcileElements, restoreElements } from '@excalidraw/excalidraw';
import { CURSOR_SYNC_TIMEOUT, LOAD_IMAGES_TIMEOUT } from '../constants';
import throttle from 'lodash.throttle';
import EventBus from '../utils/event-bus';
import FileManager from '../data/file-manager';
import { loadFilesFromServer, saveFilesToServer } from '../data/server-storage';
import { updateStaleImageStatuses } from '../utils/exdraw-utils';
import { isInitializedImageElement } from '../utils/element-utils';

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
    this._activeSendRequestId = null;
    this._retryCount = 0;

    this.pendingOperationList = [];
    this.pendingOperationBeginTimeList = [];
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
    if (!this.isNeedToSync(elements)) {
      return;
    }
    this.pendingOperationList.push(elements);

    const lastOpBeginTime = new Date().getTime();
    this.pendingOperationBeginTimeList.push(lastOpBeginTime);
    const firstOpBeginTime = this.pendingOperationBeginTimeList[0];

    const isExceedExecuteTime = (lastOpBeginTime - firstOpBeginTime) / 1000 > 30 ? true : false;
    if (isExceedExecuteTime || this.pendingOperationList.length > 200) {
      if (this.pendingOperationList.length > 200) {
        const latestOperation = this.pendingOperationList[this.pendingOperationList.length - 1];
        // The first begin time belongs to the in-flight operation when present.
        const firstPendingBeginTimeIndex = this._sendingOperation ? 1 : 0;
        const firstPendingBeginTime =
          this.pendingOperationBeginTimeList[firstPendingBeginTimeIndex] || lastOpBeginTime;

        this.pendingOperationList = [latestOperation];
        this.pendingOperationBeginTimeList = this._sendingOperation
          ? [firstOpBeginTime, firstPendingBeginTime]
          : [firstPendingBeginTime];
      }
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

  resumePendingOperations = () => {
    if (
      this.state === STATE.NEED_RELOAD ||
      this.state === STATE.SENDING ||
      this.state === STATE.CONFLICT ||
      this._sendingOperation ||
      this._activeSendRequestId
    ) {
      return;
    }

    this.state = STATE.IDLE;
    if (this.pendingOperationList.length > 0) {
      this.sendOperations();
    }
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
    const requestId = uuidv4();
    this._activeSendRequestId = requestId;
    this._sendingOperation = elements;

    this.socketClient.broadcastSceneElements(
      elements,
      version,
      (result) => this.sendOperationsCallback(result, requestId, elements),
    );
  };

  sendOperationsCallback = (result, requestId, operation) => {
    if (requestId !== this._activeSendRequestId) {
      return;
    }
    this._activeSendRequestId = null;

    if (result && result.success) {
      const { version: serverVersion } = result;
      this.setVersion(serverVersion);
      const lastSavedAt = new Date().getTime();
      this.dispatchConnectState('saved', lastSavedAt);

      this.setLastBroadcastedOrReceivedSceneVersion(operation);

      // send next operations
      this._retryCount = 0;
      this.pendingOperationBeginTimeList.shift(); // remove current operation's begin time
      this._sendingOperation = null;
      this.sendNextOperations();
      return;
    }
    // Operations are execute failure
    const error_type = result && result.error_type;
    if (error_type === 'load_document_content_error' || error_type === 'token_expired') {
      // load_document_content_error: After a short-term reconnection, the content of the document fails to load
      this.dispatchConnectState(error_type);

      // reset sending control
      stateDebug(`State Changed: ${this.state} -> ${STATE.NEED_RELOAD}`);
      this.state = STATE.NEED_RELOAD;
      this._sendingOperation = null;
    } else if (error_type === 'version_behind_server') {
      // Put the failed operation into the pending list and re-execute it
      this.pendingOperationList.unshift(operation);

      stateDebug(`State Changed: ${this.state} -> ${STATE.CONFLICT}`);
      this.state = STATE.CONFLICT;
      this.resolveConflicting(result);
    } else {
      // Keep failed operations retryable without leaving the manager in SENDING state.
      const shouldRetry = this._retryCount === 0;
      this._retryCount += 1;
      this.pendingOperationList.unshift(operation.slice());
      this._sendingOperation = null;
      stateDebug(`State Changed: ${this.state} -> ${STATE.IDLE}`);
      this.state = STATE.IDLE;
      this.dispatchConnectState(error_type || 'execute_client_operations_error', result);
      if (shouldRetry) {
        this.sendOperations();
      }
    }
  };

  resolveConflicting = (result) => {
    const { elements, version } = result;

    this.updateLocalDataByRemoteData(elements, version);

    // Keep the current operation's begin time while it is requeued for retry.
    // It is removed only after the operation is acknowledged successfully.
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

  dispatchConnectState = (type, message) => {
    if (type === 'reconnect-ready') {
      // A new connection gets a fresh operation retry budget.
      this._retryCount = 0;
      this.resumePendingOperations();
    }

    if (type === 'disconnect') {
      // Invalidate the callback of the disconnected socket and its retry budget.
      this._activeSendRequestId = null;
      this._retryCount = 0;
      // current state is sending
      if (this._sendingOperation) {
        this.pendingOperationList.unshift(this._sendingOperation.slice());
        this._sendingOperation = null;
      }
      stateDebug(`State Changed: ${this.state} -> ${STATE.DISCONNECT}`);
      this.state = STATE.DISCONNECT;
    }

    this.eventBus.dispatch(type, message);
  };

  static destroy = () => {
    this.instance = null;
    this.socketClient.close();
  };

}

export default SocketManager;

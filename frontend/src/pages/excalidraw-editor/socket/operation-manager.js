import { stateDebug } from '../utils/debug';
import { CaptureUpdateAction, getSceneVersion, reconcileElements, restoreElements } from '@excalidraw/excalidraw';

const STATE = {
  IDLE: 'idle',
  SENDING: 'sending',
  CONFLICT: 'conflict',
  DISCONNECT: 'disconnect',
  NEED_RELOAD: 'need_reload',
};

class OperationManager {

  constructor({
    excalidrawAPI,
    document,
    socketClient,
    getElementsWithoutRemotePreview,
    clearRemotePreviewRecords,
    clearPendingRemotePreviewChange,
    loadImageFiles,
    onStateChange,
  }) {
    this.excalidrawAPI = excalidrawAPI;
    this.document = document;
    this.socketClient = socketClient;
    this.getElementsWithoutRemotePreview = getElementsWithoutRemotePreview;
    this.clearRemotePreviewRecords = clearRemotePreviewRecords;
    this.clearPendingRemotePreviewChange = clearPendingRemotePreviewChange;
    this.loadImageFiles = loadImageFiles;
    this.onStateChange = onStateChange;

    this.state = STATE.IDLE;
    this.pendingOperationList = [];
    this.pendingOperationBeginTimeList = [];
    this.lastBroadcastedOrReceivedSceneVersion = 0;
    this.lastQueuedSceneVersion = 0;
    this._sendingOperation = null;

    if (document && document.elements) {
      this.setLastBroadcastedOrReceivedSceneVersion(document.elements);
    }
    this.lastQueuedSceneVersion = this.lastBroadcastedOrReceivedSceneVersion;
  }

  notifyState = (type, message) => {
    this.onStateChange(type, message);
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
      this.notifyState('pending_operations_exceed_limit');
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

    this.notifyState('is-saving');
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
      this.notifyState('saved', lastSavedAt);

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
      this.notifyState(error_type);

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

  updateLocalDataByRemoteData = (remoteElements, remoteVersion) => {
    this.clearPendingRemotePreviewChange();
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

  handleConnectState = (type) => {
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
  };
}

export default OperationManager;

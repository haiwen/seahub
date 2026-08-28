import { stateDebug } from '../utils/debug';
import { CaptureUpdateAction, getSceneVersion, reconcileElements, restoreElements } from '@excalidraw/excalidraw';
import { v4 as uuidv4 } from 'uuid';
import {
  OPERATION_MAX_RETRIES,
  OPERATION_MAX_RETRY_DELAY,
  OPERATION_RETRY_DELAY,
} from '../constants';

const STATE = {
  WAITING_FOR_ROOM: 'waiting_for_room',
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

    // The Socket.IO transport can connect before the client has joined the
    // Excalidraw room. Queue local edits, but do not send them until the
    // room-ready event is received.
    this.state = STATE.WAITING_FOR_ROOM;
    this.pendingOperationQueue = [];
    this.lastBroadcastedOrReceivedSceneVersion = 0;
    this.lastQueuedSceneVersion = 0;
    this._sendingOperation = null;

    if (document && document.elements) {
      this.setLastBroadcastedOrReceivedSceneVersion(document.elements);
    }
    this.lastQueuedSceneVersion = this.lastBroadcastedOrReceivedSceneVersion;
    this.retryTimer = null;
  }

  get operationQueue() {
    return this._sendingOperation
      ? [this._sendingOperation, ...this.pendingOperationQueue]
      : [...this.pendingOperationQueue];
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
    const queueItem = {
      uuid: uuidv4(),
      operation: elementsWithoutRemotePreview,
      beginTime: new Date().getTime(),
      retryCount: 0,
    };
    this.pendingOperationQueue.push(queueItem);

    const firstQueueItem = this.operationQueue[0];
    const isExceedExecuteTime = firstQueueItem &&
      (queueItem.beginTime - firstQueueItem.beginTime) / 1000 > 30;

    if (isExceedExecuteTime || this.pendingOperationQueue.length > 500) {
      this.notifyState('pending_operations_exceed_limit');
    }

    this.sendOperations();
  };

  createRetryQueueItem = (queueItem, retryCount = queueItem.retryCount || 0) => ({
    ...queueItem,
    uuid: uuidv4(),
    retryCount,
  });

  getRetryDelay = (retryCount) => Math.min(
    OPERATION_RETRY_DELAY * (2 ** Math.max(retryCount - 1, 0)),
    OPERATION_MAX_RETRY_DELAY,
  );

  retryOperation = (queueItem, reason) => {
    const retryCount = (queueItem.retryCount || 0) + 1;
    if (retryCount > OPERATION_MAX_RETRIES) {
      // Keep the operation available for a later reload/reconnect instead of
      // silently dropping the user's edit. Do not retry it while the manager
      // is in NEED_RELOAD state.
      this.pendingOperationQueue.unshift(this.createRetryQueueItem(queueItem, retryCount));
      this.clearRetryTimer();
      stateDebug(`${reason}. Retry budget exhausted. State Changed: ${this.state} -> ${STATE.NEED_RELOAD}`);
      this.state = STATE.NEED_RELOAD;
      this.notifyState('sync_server_operations_error');
      return;
    }

    this.pendingOperationQueue.unshift(this.createRetryQueueItem(queueItem, retryCount));
    stateDebug(`${reason}. State Changed: ${this.state} -> ${STATE.IDLE}`);
    this.state = STATE.IDLE;
    this.scheduleRetry(this.getRetryDelay(retryCount));
  };

  clearRetryTimer = () => {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  };

  scheduleRetry = (delay = OPERATION_RETRY_DELAY) => {
    if (this.retryTimer) return;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.sendOperations();
    }, delay);
  };

  sendOperations = () => {
    if (this.state !== STATE.IDLE) return;
    stateDebug(`State changed: ${this.state} -> ${STATE.SENDING}`);
    this.state = STATE.SENDING;
    this.sendNextOperations();
  };

  sendNextOperations = () => {
    if (this.state !== STATE.SENDING) return;
    if (this.pendingOperationQueue.length === 0) {
      stateDebug(`State Changed: ${this.state} -> ${STATE.IDLE}`);
      this.state = STATE.IDLE;
      return;
    }

    this.notifyState('is-saving');
    const version = this.document.version;
    const queueItem = this.pendingOperationQueue.shift();
    this._sendingOperation = queueItem;

    this.socketClient.broadcastSceneElements(
      queueItem.operation,
      version,
      (result) => this.sendOperationsCallback(result, queueItem),
    );
  };

  sendOperationsCallback = (result, queueItem) => {
    // A retry keeps the same operation and enqueue time but receives a new
    // UUID. This prevents a delayed ACK from an earlier send attempt from
    // being accepted for the current attempt.
    if (!queueItem || queueItem.uuid !== this._sendingOperation?.uuid) {
      return;
    }

    // Release the in-flight slot before changing the queue/state. Any
    // duplicate or delayed callback for this request must be ignored.
    this._sendingOperation = null;

    if (result && result.success) {
      const { version: serverVersion } = result;
      this.setVersion(serverVersion);
      const lastSavedAt = new Date().getTime();
      this.notifyState('saved', lastSavedAt);

      this.setLastBroadcastedOrReceivedSceneVersion(queueItem.operation);

      // send next operations
      this.sendNextOperations();
      return;
    }
    // Operations are execute failure
    const { error_type } = result || {};
    if (error_type === 'ack_timeout') {
      // The ACK may be lost even if the server has already processed the
      // operation. Requeue it and retry through the normal operation pipeline.
      this.retryOperation(queueItem, 'ACK timeout');
    } else if (error_type === 'load_document_content_error' || error_type === 'token_expired') {
      // load_document_content_error: After a short-term reconnection, the content of the document fails to load
      this.notifyState(error_type);

      // Reset sending control. The operation is not requeued because the
      // document must be reloaded before sending more operations.
      stateDebug(`State Changed: ${this.state} -> ${STATE.NEED_RELOAD}`);
      this.state = STATE.NEED_RELOAD;
    } else if (error_type === 'version_behind_server') {
      // Put the failed operation into the pending list and re-execute it with
      // a new UUID so a previous callback cannot match the retry.
      this.pendingOperationQueue.unshift(this.createRetryQueueItem(queueItem));

      stateDebug(`State Changed: ${this.state} -> ${STATE.CONFLICT}`);
      this.state = STATE.CONFLICT;
      this.resolveConflicting(result);
    } else {
      // Keep ordinary execution failures in the reliable queue. The operation
      // has already been removed from the pending queue, so dropping it here
      // would lose the user's edit. Retry with a new UUID so a delayed ACK
      // from the failed attempt cannot acknowledge the retry.
      this.notifyState('execute_client_operations_error', error_type);
      this.retryOperation(queueItem, `Operation failed (${error_type || 'unknown'})`);
    }
  };

  resolveConflicting = (result) => {
    const { elements, version } = result;

    this.updateLocalDataByRemoteData(elements, version);

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

  handleConnectState = (type, message) => {
    if (type === 'reconnect') {
      // A transport reconnect only means that the Socket.IO connection is
      // back. The client still has to re-join the document room. Wait for
      // room-ready before resetting retry budgets or sending operations.
      return;
    }

    if (type === 'room-ready') {
      this.clearRetryTimer();
      this.pendingOperationQueue = this.pendingOperationQueue.map((queueItem) => (
        this.createRetryQueueItem(queueItem, 0)
      ));
      this.state = STATE.IDLE;
      if (this.pendingOperationQueue.length > 0) {
        this.sendOperations();
      }
      return;
    }

    if (type === 'join-room-failed') {
      this.clearRetryTimer();
      stateDebug(`State Changed: ${this.state} -> ${STATE.NEED_RELOAD}`);
      this.state = STATE.NEED_RELOAD;
      this.notifyState('join_room_failed', message);
      return;
    }

    if (type === 'disconnect') {
      this.clearRetryTimer();
      // current state is sending
      if (this._sendingOperation) {
        this.pendingOperationQueue.unshift(this.createRetryQueueItem(this._sendingOperation));
        this._sendingOperation = null;
      }
      stateDebug(`State Changed: ${this.state} -> ${STATE.DISCONNECT}`);
      this.state = STATE.DISCONNECT;
    }
  };
}

export default OperationManager;

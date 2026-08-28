import { CaptureUpdateAction, newElementWith } from '@excalidraw/excalidraw';
import io from 'socket.io-client';
import throttle from 'lodash.throttle';
import { isSyncableElement } from '../data';
import { clientDebug, serverDebug } from '../utils/debug';
import SocketManager from './socket-manager';
import { getFilename } from '../utils/element-utils';
import {
  FILE_UPLOAD_TIMEOUT,
  JOIN_ROOM_ACK_TIMEOUT,
  JOIN_ROOM_MAX_RETRIES,
  JOIN_ROOM_MAX_RETRY_DELAY,
  JOIN_ROOM_RETRY_DELAY,
  OPERATION_ACK_TIMEOUT,
} from '../constants';

const RETRYABLE_JOIN_ROOM_ERRORS = new Set([
  'ack_timeout',
  'join_room_error',
]);

class SocketClient {
  constructor(config) {
    this.config = config;
    this.isJoiningRoom = false;
    this.isRoomReady = false;
    this.joinRoomRetryCount = 0;
    this.joinRoomRetryTimer = null;
    this.joinRoomAttemptId = 0;
    this.broadcastedElementVersions = new Map();
    this.socket = io(`${config.exdrawServer}/exdraw`, {
      reconnection: true,
      auth: { token: config.accessToken },
      query: {
        'doc_uuid': config.docUuid,
      }
    });
    this.socket.on('disconnect', this.onDisconnected);
    this.socket.on('connect_error', this.onConnectError);

    this.socket.on('init-room', this.onInitRoom);
    this.socket.on('room-user-change', this.onRoomUserChanged);
    this.socket.on('leave-room', this.onLeaveRoom);

    this.socket.on('elements-updated', this.onReceiveRemoteElementsUpdate);
    this.socket.on('elements-preview', this.onReceiveRemoteElementsPreview);
    this.socket.on('mouse-location-updated', this.onReceiveRemoteMouseLocationUpdate);

    this.socket.io.on('reconnect', this.onReconnect);
    this.socket.io.on('reconnect_attempt', this.onReconnectAttempt);
    this.socket.io.on('reconnect_error', this.onReconnectError);
  }

  getParams = (payload = {}) => {
    const { docUuid, user } = this.config;
    return {
      doc_uuid: docUuid,
      user,
      ...payload,
    };
  };

  resetJoinRoomState = ({ resetRetryCount = true, isRoomReady = false } = {}) => {
    this.clearJoinRoomRetryTimer();
    this.joinRoomAttemptId += 1;
    this.isJoiningRoom = false;
    this.isRoomReady = isRoomReady;
    if (resetRetryCount) {
      this.joinRoomRetryCount = 0;
    }
  };

  dispatchConnectState = (type, message) => {
    const socketManager = SocketManager.getInstance();
    socketManager.dispatchConnectState(type, message);
  };

  onDisconnected = (data) => {
    clientDebug('disconnect message: %s', data);
    this.resetJoinRoomState();
    this.dispatchConnectState('disconnect', data);

    if (data === 'ping timeout') {
      clientDebug('Disconnected due to ping timeout, trying to reconnect...');
      this.socket.connect();
    }
  };

  onConnectError = () => {
    clientDebug('connect_error.');
    this.dispatchConnectState('connect_error');
  };

  queueFileUpload = throttle(async () => {
    const socketManager = SocketManager.getInstance();
    let savedFiles = new Map();
    try {
      ({ savedFiles } = await socketManager.fileManager.saveFiles({
        elements: socketManager.excalidrawAPI.getSceneElementsIncludingDeleted(),
        files: socketManager.excalidrawAPI.getFiles()
      }));
    } catch (error) {
      if (error.name !== 'AbortError') {
        socketManager.excalidrawAPI.updateScene({
          appState: {
            errorMessage: error.message,
          },
        });
      }
    }

    let isChanged = false;
    const oldElements = socketManager.excalidrawAPI.getSceneElementsIncludingDeleted();
    const newElements = oldElements.map(element => {
      if (socketManager.fileManager.shouldUpdateImageElementStatus(element)) {
        isChanged = true;
        const fileData = savedFiles.get(element.fileId);
        if (fileData) {
          const filename = getFilename(element.fileId, fileData);
          return newElementWith(element, { status: 'saved', filename });
        }
        return element;
      }
      return element;
    });

    if (isChanged) {
      socketManager.excalidrawAPI.updateScene({
        elements: newElements,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    }
  }, FILE_UPLOAD_TIMEOUT);

  broadcastSceneElements = (elements, version, callback) => {
    const syncableElements = elements.reduce((acc, element) => {
      const isAddedOrUpdated = !this.broadcastedElementVersions.has(element.id) || element.version > this.broadcastedElementVersions.get(element.id);
      if (isAddedOrUpdated && isSyncableElement(element)) {
        acc.push(element);
      }
      return acc;
    }, []);

    this.queueFileUpload();

    const payload = {
      elements: syncableElements,
      version: version,
    };
    const params = this.getParams(payload);
    this.socket.timeout(OPERATION_ACK_TIMEOUT).emit('elements-updated', params, (error, result) => {
      if (error) {
        clientDebug('elements-updated ACK timeout.');
        callback && callback({ error_type: 'ack_timeout' });
        return;
      }

      if (result && result.success) {
        for (const syncableElement of syncableElements) {
          this.broadcastedElementVersions.set(
            syncableElement.id,
            syncableElement.version,
          );
        }
      }
      callback && callback(result);
    });
  };

  broadcastPreviewElements = (payload) => {
    const params = this.getParams(payload);
    this.socket.volatile.emit('server-volatile-broadcast', params);
  };

  broadcastMouseLocation = (payload) => {
    const params = this.getParams(payload);
    this.socket.emit('mouse-location-updated', params);
  };

  getJoinRoomRetryDelay = (retryCount) => Math.min(
    JOIN_ROOM_RETRY_DELAY * (2 ** Math.max(retryCount - 1, 0)),
    JOIN_ROOM_MAX_RETRY_DELAY,
  );

  clearJoinRoomRetryTimer = () => {
    if (this.joinRoomRetryTimer !== null) {
      clearTimeout(this.joinRoomRetryTimer);
      this.joinRoomRetryTimer = null;
    }
  };

  markRoomReady = (result) => {
    this.resetJoinRoomState({ isRoomReady: true });
    this.dispatchConnectState('room-ready', result);
  };

  failJoinRoom = (errorType, error) => {
    this.resetJoinRoomState({ resetRetryCount: false });
    this.dispatchConnectState('join-room-failed', {
      error_type: errorType,
      error,
      retry_count: this.joinRoomRetryCount,
    });
  };

  retryJoinRoom = (errorType, error) => {
    if (!RETRYABLE_JOIN_ROOM_ERRORS.has(errorType)) {
      this.failJoinRoom(errorType, error);
      return;
    }

    this.joinRoomRetryCount += 1;

    if (this.joinRoomRetryCount > JOIN_ROOM_MAX_RETRIES) {
      clientDebug('join-room failed after %s retries.', JOIN_ROOM_MAX_RETRIES);
      this.failJoinRoom(errorType, error);
      return;
    }

    const delay = this.getJoinRoomRetryDelay(this.joinRoomRetryCount);
    this.clearJoinRoomRetryTimer();
    this.joinRoomRetryTimer = setTimeout(() => {
      this.joinRoomRetryTimer = null;
      this.joinRoom();
    }, delay);
  };

  joinRoom = () => {
    if (!this.isJoiningRoom || !this.socket.connected) {
      return;
    }

    const attemptId = ++this.joinRoomAttemptId;
    this.socket.timeout(JOIN_ROOM_ACK_TIMEOUT).emit(
      'join-room',
      this.getParams(),
      (error, result) => {
        if (attemptId !== this.joinRoomAttemptId || !this.isJoiningRoom) {
          return;
        }

        if (!error && result && result.success) {
          this.markRoomReady(result);
          return;
        }

        const errorType = error ? 'ack_timeout' : (result?.error_type || 'join_room_error');
        this.retryJoinRoom(errorType, error || result);
      },
    );
  };

  onInitRoom = () => {
    serverDebug('join-room message');
    this.resetJoinRoomState();
    this.isJoiningRoom = true;
    this.joinRoom();
  };

  onRoomUserChanged = (users) => {
    serverDebug('room users changed. all users count: %s', users.length);
    const socketManager = SocketManager.getInstance();
    socketManager.receiveRoomUserChanged(users);
  };

  onLeaveRoom = (userInfo) => {
    serverDebug('%s leaved room success.', userInfo.name);
    const socketManager = SocketManager.getInstance();
    socketManager.receiveLeaveRoom(userInfo);
  };

  onReceiveRemoteElementsUpdate = (params) => {
    serverDebug('sync elements by another updated, %O', params);
    const socketManager = SocketManager.getInstance();
    socketManager.handleRemoteSceneUpdated(params);
  };

  onReceiveRemoteElementsPreview = (params) => {
    serverDebug('receive another preview elements, %O', params);
    const socketManager = SocketManager.getInstance();
    socketManager.handleRemotePreviewElements(params);
  };

  onReceiveRemoteMouseLocationUpdate = (params) => {
    serverDebug('sync another\'s mouse location, %O', params);
    const socketManager = SocketManager.getInstance();
    socketManager.handleRemoteMouseLocationUpdated(params);
  };

  onReconnect = () => {
    clientDebug('reconnect.');
    const socketManager = SocketManager.getInstance();
    socketManager.dispatchConnectState('reconnect');
  };

  onReconnectAttempt = (attemptNumber) => {
    clientDebug('reconnect_attempt. %s', attemptNumber);
    const socketManager = SocketManager.getInstance();
    socketManager.dispatchConnectState('reconnect_attempt', attemptNumber);
  };

  onReconnectError = () => {
    clientDebug('reconnect_error.');
    const socketManager = SocketManager.getInstance();
    socketManager.dispatchConnectState('reconnect_error');
  };

  close = () => {
    this.resetJoinRoomState();
    this.socket.close();
  };

}

export default SocketClient;

import { CaptureUpdateAction, newElementWith } from '@excalidraw/excalidraw';
import io from 'socket.io-client';
import throttle from 'lodash.throttle';
import { isSyncableElement } from '../data';
import { clientDebug, serverDebug } from '../utils/debug';
import SocketManager from './socket-manager';
import { getFilename } from '../utils/element-utils';
import { FILE_UPLOAD_TIMEOUT } from '../constants';

const JOIN_ROOM_ACK_TIMEOUT = 5000;
const MAX_JOIN_ROOM_RETRIES = 3;
const JOIN_ROOM_RETRY_DELAY = 1000;

class SocketClient {
  constructor(config) {
    this.config = config;
    this.isReconnect = false;
    this.joinRoomRetryCount = 0;
    this.joinRoomRetryTimer = null;
    this.broadcastedElementVersions = new Map();
    this.socket = io(`${config.exdrawServer}/exdraw`, {
      reconnection: true,
      auth: { token: config.accessToken },
      query: {
        'doc_uuid': config.docUuid,
      }
    });
    this.socket.on('connect', this.onConnected);
    this.socket.on('disconnect', this.onDisconnected);
    this.socket.on('connect_error', this.onConnectError);

    this.socket.on('init-room', this.onInitRoom);
    this.socket.on('room-user-change', this.onRoomUserChanged);
    this.socket.on('leave-room', this.onLeaveRoom);

    this.socket.on('elements-updated', this.onReceiveRemoteElementsUpdate);
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

  onConnected = () => {
    clientDebug('connected.');
  };

  onDisconnected = (data) => {
    clientDebug('disconnect message: %s', data);
    this.isReconnect = true;
    this.joinRoomRetryCount = 0;
    this.clearJoinRoomRetryTimer();
    const socketManager = SocketManager.getInstance();

    // Requeue the in-flight operation for every disconnect reason before reconnecting.
    socketManager.dispatchConnectState('disconnect', data);

    if (data === 'ping timeout') {
      clientDebug('Disconnected due to ping timeout, trying to reconnect...');
      this.socket.connect();
    }
  };

  onConnectError = () => {
    clientDebug('connect_error.');
    const socketManager = SocketManager.getInstance();
    socketManager.dispatchConnectState('connect_error');
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
    this.socket.emit('elements-updated', params, (result) => {
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

  broadcastMouseLocation = (payload) => {
    const params = this.getParams(payload);
    this.socket.emit('mouse-location-updated', params);
  };

  clearJoinRoomRetryTimer = () => {
    if (this.joinRoomRetryTimer) {
      clearTimeout(this.joinRoomRetryTimer);
      this.joinRoomRetryTimer = null;
    }
  };

  scheduleJoinRoomRetry = (error) => {
    if (!this.isReconnect || !this.socket.connected) {
      return;
    }

    if (this.joinRoomRetryCount < MAX_JOIN_ROOM_RETRIES) {
      this.joinRoomRetryCount += 1;
      const retryDelay = Math.min(
        JOIN_ROOM_RETRY_DELAY * (2 ** (this.joinRoomRetryCount - 1)),
        5000,
      );
      serverDebug(
        'join room failed after reconnect, retrying (%s/%s) in %sms: %O',
        this.joinRoomRetryCount,
        MAX_JOIN_ROOM_RETRIES,
        retryDelay,
        error,
      );
      this.clearJoinRoomRetryTimer();
      this.joinRoomRetryTimer = setTimeout(() => {
        this.joinRoomRetryTimer = null;
        this.joinRoom();
      }, retryDelay);
      return;
    }

    serverDebug('join room retries exhausted after reconnect: %O', error);
    const socketManager = SocketManager.getInstance();
    socketManager.dispatchConnectState('join_room_error', error);
  };

  joinRoom = () => {
    this.socket.timeout(JOIN_ROOM_ACK_TIMEOUT).emit('join-room', this.getParams(), (timeoutError, result) => {
      if (!this.isReconnect) {
        return;
      }

      if (timeoutError || !result || !result.success) {
        this.scheduleJoinRoomRetry(timeoutError || result || { error_type: 'join_room_timeout' });
        return;
      }

      this.clearJoinRoomRetryTimer();
      this.joinRoomRetryCount = 0;
      this.isReconnect = false;
      const socketManager = SocketManager.getInstance();
      socketManager.dispatchConnectState('reconnect-ready');
      socketManager.dispatchConnectState('reconnect');
    });
  };

  onInitRoom = () => {
    serverDebug('join-room message');
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

  onReceiveRemoteMouseLocationUpdate = (params) => {
    serverDebug('sync another\'s mouse location, %O', params);
    const socketManager = SocketManager.getInstance();
    socketManager.handleRemoteMouseLocationUpdated(params);
  };

  onReconnect = () => {
    clientDebug('reconnect.');
    this.isReconnect = true;
    this.joinRoomRetryCount = 0;
    this.clearJoinRoomRetryTimer();
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
    this.socket.close();
  };

}

export default SocketClient;

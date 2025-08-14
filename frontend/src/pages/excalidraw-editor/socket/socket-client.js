import { CaptureUpdateAction, newElementWith } from '@excalidraw/excalidraw';
import io from 'socket.io-client';
import throttle from 'lodash.throttle';
import { isSyncableElement } from '../data';
import { clientDebug, serverDebug } from '../utils/debug';
import SocketManager from './socket-manager';
import { getFilename } from '../utils/element-utils';
import { FILE_UPLOAD_TIMEOUT } from '../constants';

class SocketClient {
  constructor(config) {
    this.config = config;
    this.isReconnect = false;
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
    if (this.isReconnect) {
      this.isReconnect = false;
    }
  };

  onDisconnected = (data) => {
    if (data === 'ping timeout') {
      clientDebug('Disconnected due to ping timeout, trying to reconnect...');
      this.socket.connect();
      return;
    }

    clientDebug('disconnect message: %s', data);
    const socketManager = SocketManager.getInstance();
    socketManager.dispatchConnectState('disconnect');
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

    for (const syncableElement of syncableElements) {
      this.broadcastedElementVersions.set(
        syncableElement.id,
        syncableElement.version,
      );
    }

    this.queueFileUpload();

    const payload = {
      elements: syncableElements,
      version: version,
    };
    const params = this.getParams(payload);
    this.socket.emit('elements-updated', params, (result) => {
      callback && callback(result);
    });
  };

  broadcastMouseLocation = (payload) => {
    const params = this.getParams(payload);
    this.socket.emit('mouse-location-updated', params);
  };

  onInitRoom = () => {
    serverDebug('join-room message');
    this.socket.emit('join-room', this.getParams());
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
    this.socket.close();
  };

}

export default SocketClient;

import io from 'socket.io-client';
import { clientDebug, serverDebug } from '../utils/debug';
import SocketManager from './socket-manager';
import { isSyncableElement } from '../data';

class SocketClient {

  constructor(config) {
    this.config = config;
    this.isReconnect = false;

    this.broadcastedElementVersions = new Map();
    this.socket = io(`${config.exdrawServer}/exdraw`, {
      reconnection: true,
      auth: { token: config.accessToken },
      query: {
        'sdoc_uuid': config.docUuid,
      }
    });
    this.socket.on('connect', this.onConnected);
    this.socket.on('disconnect', this.onDisconnected);
    this.socket.on('connect_error', this.onConnectError);
    this.socket.on('room-user-change', this.onRoomUserChange);
    this.socket.on('leave-room', this.onLeaveRoom);

    this.socket.on('client-broadcast', this.onReceiveRemoteOperations);
    this.socket.on('mouse-location', this.receiveMouseLocation);
  }

  getParams = (params = {}) => {
    const { docUuid, user } = this.config;
    return {
      doc_uuid: docUuid,
      user,
      ...params
    };
  };

  onConnected = () => {
    // join room
    this.socket.emit('join-room', this.getParams({}), (result) => {
      const socketManager = SocketManager.getInstance();
      if (result.success) {
        socketManager.dispatchConnectState('onConnected', result);
        return;
      }

      // Disconnect the server in the client side. There will be no reconnection.
      this.socket.disconnect();
      socketManager.dispatchConnectState('connect-error', result);
    });
  };

  onDisconnected = (data) => {
    clientDebug('disconnect message: %s', data);
    const socketManager = SocketManager.getInstance();
    socketManager.dispatchConnectState('disconnect');
  };

  onConnectError = (e) => {
    clientDebug('connect_error.');
    const socketManager = SocketManager.getInstance();
    socketManager.dispatchConnectState('connect_error');
  };

  broadcastElements = async (elements, isSyncAll) => {
    const syncableElements = elements.reduce((acc, element) => {
      const isAddedOrUpdated = !this.broadcastedElementVersions.has(element.id) || element.version > this.broadcastedElementVersions.get(element.id);
      if (isSyncAll || (isAddedOrUpdated && isSyncableElement(element))) {
        acc.push(element);
      }
      return acc;
    }, []);
    this.socket.emit('server-broadcast', this.getParams({ elements: syncableElements }));
  };

  onJoinRoom = (userInfo) => {
    serverDebug('%s joined room success.', userInfo.name);
    const socketManager = SocketManager.getInstance();
    socketManager.dispatchConnectState('join-room', userInfo);
  };

  onRoomUserChange = (users) => {
    serverDebug('room users changed. all users count: %s', users.length);
    const socketManager = SocketManager.getInstance();
    socketManager.receiveRoomUserChanged(users);
  };

  onLeaveRoom = (userInfo) => {
    serverDebug('%s leaved room success.', userInfo.name);
    const socketManager = SocketManager.getInstance();
    socketManager.receiveLeaveRoom(userInfo);
  };

  /**
   * receive remote broadcast operations
   * @param {*} params {operations, version}
   */
  onReceiveRemoteOperations = (params) => {
    serverDebug('receive operations: %O', params);
    const socketManager = SocketManager.getInstance();
    socketManager.onReceiveRemoteOperations(params);
  };

  broadcastMouseLocation = (payload) => {
    this.socket.emit('mouse-location', this.getParams(payload));
  };

  receiveMouseLocation = (params) => {
    const socketManager = SocketManager.getInstance();
    socketManager.receiveMouseLocation(params);
  };

  disconnectWithServer = () => {
    this.socket.disconnect();
  };

}

export default SocketClient;

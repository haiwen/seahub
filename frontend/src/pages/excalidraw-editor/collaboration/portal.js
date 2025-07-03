import { WS_SUBTYPES } from '../constants';
import { isSyncableElement } from '../data';
import { serverDebug } from '../utils/debug';

class Portal {
  constructor(collab, settings) {
    this.collab = collab;
    this.settings = settings;
    this.socket = null;
    this.socketInitialized = false;
    this.broadcastedElementVersions = new Map();
  }

  getParams = (params = {}) => {
    const { docUuid, user } = this.settings;
    return {
      doc_uuid: docUuid,
      user,
      ...params
    };
  };

  open = (socket) => {
    this.socket = socket;
    this.socket.on('init-room', () => {
      if (this.socket) {
        serverDebug('join-room message');
        this.socket.emit('join-room', this.getParams({}));
      }
    });

    this.socket.on('new-user', async () => {
      serverDebug('sync with elements to another');
      const elements = this.collab.getSceneElementsIncludingDeleted();
      const isSyncAll = true;
      this.broadcastScene(WS_SUBTYPES.INIT, elements, isSyncAll);
    });

    this.socket.on('room-user-change', (users) => {
      serverDebug('room users changed. all users count: %s', users.length);
      this.collab.receiveRoomUserChanged(users);
    });

    this.socket.on('leave-room', (userInfo) => {
      serverDebug('%s leaved room success.', userInfo.name);
      this.collab.receiveLeaveRoom(userInfo);
    });

    return socket;
  };

  _broadcastSocketData = (data) => {
    const newData = this.getParams(data);
    this.socket.emit('server-broadcast', newData);
  };

  broadcastScene = async (updateType, elements, isSyncAll) => {
    const syncableElements = elements.reduce((acc, element) => {
      const isAddedOrUpdated = !this.broadcastedElementVersions.has(element.id) || element.version > this.broadcastedElementVersions.get(element.id);
      if (isSyncAll || (isAddedOrUpdated && isSyncableElement(element))) {
        acc.push(element);
      }
      return acc;
    }, []);
    const payload = { elements, syncableElements };
    this._broadcastSocketData({ type: updateType, payload });
  };

  broadcastMouseLocation = (payload) => {
    const type = WS_SUBTYPES.MOUSE_LOCATION;
    this._broadcastSocketData({ type, ...payload });
  };

  close = () => {
    if (!this.socket) return;
    this.socket.close();
    this.socket = null;
    this.socketInitialized = false;
    this.broadcastedElementVersions = new Map();
  };

  isOpen = () => {
    return !!(this.socketInitialized && this.socket);
  };
}

export default Portal;

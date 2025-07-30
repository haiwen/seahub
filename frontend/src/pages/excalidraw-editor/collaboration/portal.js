import throttle from 'lodash.throttle';
import { FILE_UPLOAD_TIMEOUT, WS_SUBTYPES } from '../constants';
import { isSyncableElement } from '../data';
import { serverDebug } from '../utils/debug';
import { CaptureUpdateAction, newElementWith } from '@excalidraw/excalidraw';
import { getFilename } from '../utils/element-utils';

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

  queueFileUpload = throttle(async () => {
    let savedFiles = new Map();
    let erroredFiles = new Map();
    try {
      ({ savedFiles, erroredFiles } = await this.collab.fileManager.saveFiles({
        elements: this.collab.excalidrawAPI.getSceneElementsIncludingDeleted(),
        files: this.collab.excalidrawAPI.getFiles()
      }));
    } catch (error) {
      if (error.name !== 'AbortError') {
        this.collab.excalidrawAPI.updateScene({
          appState: {
            errorMessage: error.message,
          },
        });
      }
    }

    let isChanged = false;
    const oldElements = this.collab.getSceneElementsIncludingDeleted();
    const newElements = oldElements.map(element => {
      if (this.collab.fileManager.shouldUpdateImageElementStatus(element)) {
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
      this.collab.excalidrawAPI.updateScene({
        elements: newElements,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    }
  }, FILE_UPLOAD_TIMEOUT);

  _broadcastSocketData = (data) => {
    const newData = this.getParams(data);
    this.socket.emit('server-broadcast', newData);
  };

  broadcastScene = async (updateType, elements, isSyncAll) => {
    if (updateType === WS_SUBTYPES.INIT && !isSyncAll) {
      throw new Error('syncAll must be true when sending SCENE.INIT');
    }

    const syncableElements = elements.reduce((acc, element) => {
      const isAddedOrUpdated = !this.broadcastedElementVersions.has(element.id) || element.version > this.broadcastedElementVersions.get(element.id);
      if (isSyncAll || (isAddedOrUpdated && isSyncableElement(element))) {
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

    const payload = { elements: syncableElements };
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

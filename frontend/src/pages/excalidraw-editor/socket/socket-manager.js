import SocketClient from './socket-client';
import { CURSOR_SYNC_TIMEOUT, LOAD_IMAGES_TIMEOUT } from '../constants';
import throttle from 'lodash.throttle';
import EventBus from '../utils/event-bus';
import FileManager from '../data/file-manager';
import { loadFilesFromServer, saveFilesToServer } from '../data/server-storage';
import { updateStaleImageStatuses } from '../utils/exdraw-utils';
import { isInitializedImageElement } from '../utils/element-utils';
import PreviewManager from './preview-manager';
import OperationManager from './operation-manager';

class SocketManager {

  constructor(excalidrawAPI, document, config) {
    this.config = config;
    this.document = document;
    this.excalidrawAPI = excalidrawAPI;
    this.collaborators = new Map();
    const { user } = config;
    this.collaborators.set(user._username, user, { isCurrentUser: true });
    this.excalidrawAPI.updateScene({ collaborators: this.collaborators });

    this.eventBus = EventBus.getInstance();
    this.socketClient = new SocketClient(config);
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

    this.previewManager = new PreviewManager(
      excalidrawAPI,
      this.socketClient,
      (elements) => this.operationManager.syncLocalElementsToOthers(elements),
    );
    this.operationManager = new OperationManager({
      excalidrawAPI,
      document,
      socketClient: this.socketClient,
      getElementsWithoutRemotePreview: this.previewManager.getElementsWithoutRemotePreview,
      clearRemotePreviewRecords: this.previewManager.clearRemotePreviewRecords,
      clearPendingRemotePreviewChange: this.previewManager.clearPendingRemotePreviewChange,
      loadImageFiles: this.loadImageFiles,
      onStateChange: this.dispatchConnectState,
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

  get activeGesture() {
    return this.previewManager.activeGesture;
  }

  get state() {
    return this.operationManager.state;
  }

  get pendingOperationList() {
    return this.operationManager.pendingOperationList;
  }

  get pendingOperationBeginTimeList() {
    return this.operationManager.pendingOperationBeginTimeList;
  }

  startGesture = (activeTool, pointerDownState) => {
    this.previewManager.startGesture(activeTool, pointerDownState);
  };

  updateGesture = (elements, appState) => {
    return this.previewManager.updateGesture(elements, appState);
  };

  broadcastPreviewElements = (elements, gesture) => {
    this.previewManager.broadcastPreviewElements(elements, gesture);
  };

  consumeRemotePreviewChange = (elements) => {
    return this.previewManager.consumeRemotePreviewChange(elements);
  };

  getElementsWithoutRemotePreview = (elements) => {
    return this.previewManager.getElementsWithoutRemotePreview(elements);
  };

  handleRemotePreviewElements = (params) => {
    this.previewManager.handleRemotePreviewElements(params);
  };

  commitGesture = (elements, gesture, reason) => {
    return this.previewManager.commitGesture(elements, gesture, reason);
  };

  handlePointerDown = (activeTool, pointerDownState) => {
    this.previewManager.handlePointerDown(activeTool, pointerDownState);
  };

  handlePointerUp = (activeTool, pointerDownState) => {
    return this.previewManager.handlePointerUp(activeTool, pointerDownState);
  };

  getVersion = () => {
    return this.operationManager.getVersion();
  };

  setVersion = (version) => {
    this.operationManager.setVersion(version);
  };

  setLastBroadcastedOrReceivedSceneVersion = (elements) => {
    this.operationManager.setLastBroadcastedOrReceivedSceneVersion(elements);
  };

  getLastBroadcastedOrReceivedSceneVersion = () => {
    return this.operationManager.getLastBroadcastedOrReceivedSceneVersion();
  };

  isNeedToSync = (elements) => {
    return this.operationManager.isNeedToSync(elements);
  };

  syncLocalElementsToOthers = (elements) => {
    this.operationManager.syncLocalElementsToOthers(elements);
  };

  sendOperations = () => {
    this.operationManager.sendOperations();
  };

  updateLocalDataByRemoteData = (remoteElements, remoteVersion) => {
    this.operationManager.updateLocalDataByRemoteData(remoteElements, remoteVersion);
  };

  handleRemoteSceneUpdated = (params) => {
    this.operationManager.handleRemoteSceneUpdated(params);
  };

  syncMouseLocationToOthers = throttle((payload) => {
    if (payload.pointersMap.size < 2) {
      const { pointer, button } = payload;
      this.socketClient.broadcastMouseLocation({ pointer, button });
    }
  }, CURSOR_SYNC_TIMEOUT);

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

  dispatchConnectState = (type, message) => {
    this.operationManager.handleConnectState(type);
    this.eventBus.dispatch(type, message);
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

  static destroy = () => {
    if (this.instance?.socketClient) {
      this.instance.socketClient.close();
    }
    this.instance = null;
  };

}

export default SocketManager;

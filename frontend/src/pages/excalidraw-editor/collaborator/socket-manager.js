import { CaptureUpdateAction, getSceneVersion, reconcileElements, restoreElements } from '@excalidraw/excalidraw';
import throttle from 'lodash.throttle';
import SocketClient from './socket-client';
import EventBus from '../utils/event-bus';
import { CURSOR_SYNC_TIMEOUT, SYNC_FULL_SCENE_INTERVAL_MS } from '../constants';
import { getSyncableElements } from '../data';
import { saveToServerStorage } from '../data/server-storage';

class SocketManager {

  constructor(excalidrawAPI, document, config) {
    this.excalidrawAPI = excalidrawAPI;
    this.document = document;
    this.eventBus = EventBus.getInstance();

    this.socketClient = new SocketClient(config);
    this.collaborators = new Map();
    const { user } = config;
    this.collaborators.set(user._username, user, { isCurrentUser: true });
    this.lastBroadcastedOrReceivedSceneVersion = 0;
    if (document && document.elements) {
      this.lastBroadcastedOrReceivedSceneVersion = getSceneVersion(document.elements);
    }
    this.excalidrawAPI.updateScene({ collaborators: this.collaborators });
  }

  static getInstance = (excalidrawAPI, document, socketConfig) => {
    if (this.instance) {
      return this.instance;
    }

    if (!document || !socketConfig) {
      throw new Error('SocketManager init params is invalid. Place check your code to fix it.');
    }

    this.instance = new SocketManager(excalidrawAPI, document, socketConfig);
    return this.instance;
  };

  getSocketId = () => {
    return this.socketClient.socket?.id;
  };

  getLastBroadcastedOrReceivedSceneVersion = () => {
    return this.lastBroadcastedOrReceivedSceneVersion;
  };

  getSceneElementsIncludingDeleted = (elements) => {
    return this.excalidrawAPI.getSceneElementsIncludingDeleted();
  };

  setLastBroadcastedOrReceivedSceneVersion = (version) => {
    this.lastBroadcastedOrReceivedSceneVersion = version;
  };

  getDocumentVersion = () => {
    const { version } = this.document;
    return version;
  };

  updateDocumentVersion = (version) => {
    this.document['version'] = version;
  };

  syncElements = (elements) => {
    this.broadcastElements(elements);
    this.queueSaveToServerStorage();
  };

  broadcastElements = (elements) => {
    if (getSceneVersion(elements) > this.getLastBroadcastedOrReceivedSceneVersion()) {
      this.socketClient.broadcastElements(elements, false);
      this.lastBroadcastedOrReceivedSceneVersion = getSceneVersion(elements);
      this.queueBroadcastAllElements();
    }
  };

  queueBroadcastAllElements = throttle(() => {
    const elements = this.excalidrawAPI.getSceneElementsIncludingDeleted();
    this.socketClient.broadcastElements(elements, true);

    const currentVersion = this.getLastBroadcastedOrReceivedSceneVersion();
    const newVersion = Math.max(currentVersion, getSceneVersion(elements));
    this.setLastBroadcastedOrReceivedSceneVersion(newVersion);
  }, SYNC_FULL_SCENE_INTERVAL_MS);

  queueSaveToServerStorage = throttle(
    () => {
      const elements = getSyncableElements(this.excalidrawAPI.getSceneElementsIncludingDeleted());
      this.saveCollabRoomToServerStorage(elements);
    },
    SYNC_FULL_SCENE_INTERVAL_MS,
    { leading: false }
  );

  saveCollabRoomToServerStorage = async (elements) => {
    const version = this.getDocumentVersion();
    const exdrawContent = { version, elements };
    const socket = this.socketClient.socket;
    const result = await saveToServerStorage(socket.id, exdrawContent, this.excalidrawAPI.getAppState());

    if (!result) return;

    this.updateDocumentVersion(result.version);
    this.excalidrawAPI.updateScene({ elements: result.storedElements });
  };

  onReceiveRemoteOperations = (params) => {
    const { elements: remoteElements } = params;
    const localElements = this.getSceneElementsIncludingDeleted();
    const appState = this.excalidrawAPI.getAppState();
    const restoredRemoteElements = restoreElements(remoteElements, null);
    const reconciledElements = reconcileElements(localElements, restoredRemoteElements, appState);

    // Avoid broadcasting to the rest of the collaborators the scene
    // we just received!
    // Note: this needs to be set before updating the scene as it
    // synchronously calls render.
    this.setLastBroadcastedOrReceivedSceneVersion(getSceneVersion(reconciledElements));

    this.excalidrawAPI.updateScene({
      elements: reconciledElements,
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  };

  syncPointer = throttle((payload) => {
    if (payload.pointersMap.size < 2) {
      const { pointer, button } = payload;
      this.socketClient.broadcastMouseLocation({ pointer, button });
    }
  }, CURSOR_SYNC_TIMEOUT);

  receiveMouseLocation = (params) => {
    const collaborators = new Map(this.collaborators);
    const { user, ...updates } = params;
    const newUser = Object.assign({}, collaborators.get(user._username), updates);
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
      this.excalidrawAPI.updateScene({ collaborators });
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
    if (type === 'leave-room') {
      this.editor.onCursor && this.editor.onCursor(this.editor.cursors);
    }

    this.eventBus.dispatch(type, message);
  };

  closeSocketConnect = () => {
    this.socketClient.disconnectWithServer();
  };

  static destroy = () => {
    this.instance = null;
  };

}

export default SocketManager;

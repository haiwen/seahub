import { CaptureUpdateAction, getSceneVersion, reconcileElements, restoreElements } from '@excalidraw/excalidraw';
import throttle from 'lodash.throttle';
import io from 'socket.io-client';
import { CURSOR_SYNC_TIMEOUT, INITIAL_SCENE_UPDATE_TIMEOUT, SYNC_FULL_SCENE_INTERVAL_MS, WS_SUBTYPES } from '../constants';
import { getSyncableElements } from '../data';
import { loadFromServerStorage, saveToServerStorage } from '../data/server-storage';
import { resolvablePromise } from '../utils/exdraw-utils';
import { serverDebug } from '../utils/debug';
import Portal from './portal';

class Collab {

  constructor(excalidrawAPI, config) {
    this.excalidrawAPI = excalidrawAPI;
    this.config = config;
    this.document = null;

    this.collaborators = new Map();
    const { user } = config;
    this.collaborators.set(user._username, user, { isCurrentUser: true });
    this.excalidrawAPI.updateScene({ collaborators: this.collaborators });

    this.lastBroadcastedOrReceivedSceneVersion = 0;
    this.portal = new Portal(this, config);
  }

  setDocument = (document) => {
    this.document = document;
  };

  getDocumentVersion = () => {
    const { version } = this.document;
    return version;
  };

  updateDocumentVersion = (version) => {
    this.document['version'] = version;
  };

  getLastBroadcastedOrReceivedSceneVersion = () => {
    return this.lastBroadcastedOrReceivedSceneVersion;
  };

  getSceneElementsIncludingDeleted = () => {
    return this.excalidrawAPI.getSceneElementsIncludingDeleted();
  };

  setLastBroadcastedOrReceivedSceneVersion = (version) => {
    this.lastBroadcastedOrReceivedSceneVersion = version;
  };

  initializeRoom = async (fetchScene) => {
    clearTimeout(this.socketInitializationTimer);
    if (this.portal.socket && this.fallbackInitializationHandler) {
      this.portal.socket.off('connect_error', this.fallbackInitializationHandler);
    }
    if (fetchScene && this.portal.socket) {
      this.excalidrawAPI.resetScene();

      try {
        const document = await loadFromServerStorage();
        const { elements } = document;
        if (elements) {
          const version = getSceneVersion(elements);
          this.setLastBroadcastedOrReceivedSceneVersion(version);
          this.setDocument(document);
          return {
            elements,
            scrollToContent: true,
          };
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(error);
      } finally {
        this.portal.socketInitialized = true;
      }
    } else {
      this.portal.socketInitialized = true;
    }

    return null;
  };

  startCollaboration = async () => {
    if (this.portal.socket) return;

    const scenePromise = resolvablePromise();
    const fallbackInitializationHandler = () => {
      this.initializeRoom(true).then(scene => {
        scenePromise.resolve(scene);
      });
    };

    this.fallbackInitializationHandler = fallbackInitializationHandler;

    const config = this.config;
    try {
      const socket = io(`${config.exdrawServer}/exdraw`, {
        auth: { token: config.accessToken },
        query: {
          'sdoc_uuid': config.docUuid,
        }
      });
      this.portal.socket = this.portal.open(socket);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
      return null;
    }

    this.socketInitializationTimer = window.setTimeout(
      fallbackInitializationHandler,
      INITIAL_SCENE_UPDATE_TIMEOUT,
    );

    this.portal.socket.on('first-in-room', async () => {
      if (this.portal.socket) {
        serverDebug('first in room message');
        this.portal.socket.off('first-in-room');
      }
      const sceneData = await this.initializeRoom(true);
      scenePromise.resolve(sceneData);
    });

    this.portal.socket.on('client-broadcast', (params) => {
      const { type, payload } = params;
      switch (type) {
        case WS_SUBTYPES.INIT:
          if (!this.portal.socketInitialized) {
            serverDebug('sync with elements from another, %O', payload);
            this.initializeRoom({ fetchScene: false });
            this.handleRemoteSceneUpdate(payload);
            this.setDocument(payload);

            const { elements } = payload;
            scenePromise.resolve({ elements, scrollToContent: true });
          }
          break;
        case WS_SUBTYPES.UPDATE:
          serverDebug('sync elements by another updated, %O', payload);
          this.handleRemoteSceneUpdate(payload);
          break;
        case WS_SUBTYPES.MOUSE_LOCATION:
          serverDebug('sync another\'s mouse location');
          this.handleRemoteMouseLocation(params);
          break;
        default:
          // eslint-disable-next-line no-console
          console.log('never execute to here');
      }
    });

    return scenePromise;
  };

  stopCollaboration = () => {
    this.queueBroadcastAllElements.cancel();
    this.queueSaveToServerStorage.cancel();

    const elements = getSyncableElements(this.excalidrawAPI.getSceneElementsIncludingDeleted());
    this.saveCollabRoomToServerStorage(elements);

    if (this.portal.socket && this.fallbackInitializationHandler) {
      this.portal.socket.off('connect_error', this.fallbackInitializationHandler);
    }

    this.destroySocketClient();
  };

  syncElements = (elements) => {
    this.broadcastElements(elements);
    this.queueSaveToServerStorage();
  };

  broadcastElements = (elements) => {
    if (getSceneVersion(elements) > this.getLastBroadcastedOrReceivedSceneVersion()) {
      this.portal.broadcastScene(WS_SUBTYPES.UPDATE, elements, false);
      this.lastBroadcastedOrReceivedSceneVersion = getSceneVersion(elements);
      this.queueBroadcastAllElements();
    }
  };

  queueBroadcastAllElements = throttle(() => {
    const elements = this.excalidrawAPI.getSceneElementsIncludingDeleted();
    this.portal.broadcastScene(WS_SUBTYPES.UPDATE, elements, true);

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
    const socket = this.portal.socket;
    const result = await saveToServerStorage(socket.id, exdrawContent, this.excalidrawAPI.getAppState());

    if (!result) return;

    this.updateDocumentVersion(result.version);
    this.excalidrawAPI.updateScene({ elements: result.storedElements });
  };

  handleRemoteSceneUpdate = (params) => {
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
      this.portal.broadcastMouseLocation({ pointer, button });
    }
  }, CURSOR_SYNC_TIMEOUT);

  handleRemoteMouseLocation = (params) => {
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

  destroySocketClient = () => {
    this.lastBroadcastedOrReceivedSceneVersion = -1;
    this.portal.close();
  };

}

export default Collab;

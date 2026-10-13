import { CaptureUpdateAction } from '@excalidraw/excalidraw';
import { PREVIEW_COMMIT_DELAY } from '../constants';
import SocketManager from './socket-manager';

jest.mock('@excalidraw/excalidraw', () => ({
  CaptureUpdateAction: { NEVER: 'never' },
  getSceneVersion: elements => elements.reduce((version, element) => version + element.version, 0),
  restoreElements: elements => elements,
  reconcileElements: (localElements, remoteElements) => {
    const elements = new Map(localElements.map(element => [element.id, element]));
    remoteElements.forEach(element => {
      const localElement = elements.get(element.id);
      if (!localElement || element.version > localElement.version) {
        elements.set(element.id, element);
      }
    });
    return Array.from(elements.values());
  },
}));

jest.mock('./socket-client', () => jest.fn().mockImplementation(() => ({
  broadcastSceneElements: jest.fn(),
})));
jest.mock('../data/file-manager', () => jest.fn());
jest.mock('../data/server-storage', () => ({}));
jest.mock('../utils/debug', () => ({ stateDebug: jest.fn() }));
jest.mock('../utils/element-utils', () => ({}));
jest.mock('../utils/exdraw-utils', () => ({}));

describe('SocketManager remote scene baseline', () => {
  let manager;
  let sceneElements;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    sceneElements = [{ id: 'local', version: 1 }];
    manager = new SocketManager(
      {
        updateScene: jest.fn(({ elements }) => {
          if (elements) {
            sceneElements = elements;
            // Model the onChange triggered when a remote scene is applied.
            manager.updatePreview(elements);
          }
        }),
        getSceneElementsIncludingDeleted: jest.fn(() => sceneElements),
        getAppState: jest.fn(() => ({})),
      },
      { elements: sceneElements, version: 1 },
      { user: { _username: 'test-user' } },
    );
    manager.loadImageFiles = jest.fn();
    manager.excalidrawAPI.updateScene.mockClear();
  });

  afterEach(() => {
    manager.cancelRemoteSceneRender();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('records the document version without advancing the unapplied scene baseline', () => {
    manager.handleRemoteSceneUpdated({
      elements: [{ id: 'remote', version: 3 }], version: 8,
    });

    expect(manager.getVersion()).toBe(8);
    expect(manager.getLastBroadcastedOrReceivedSceneVersion()).toBe(1);
    expect(manager.pendingRemoteUpdates).toHaveLength(1);
    expect(manager.excalidrawAPI.updateScene).not.toHaveBeenCalled();
    expect(manager.previewElements).toBeNull();
  });

  test.each([2, 3])('sends a local edit made before a remote version %i is rendered', remoteVersion => {
    const remoteElements = [{ id: 'remote', version: remoteVersion }];
    manager.handleRemoteSceneUpdated({ elements: remoteElements, version: 8 });

    sceneElements = [{ id: 'local', version: 2 }];
    manager.updatePreview(sceneElements);

    expect(manager.previewElements).toEqual(sceneElements);
    jest.advanceTimersToNextFrame();
    expect(manager.excalidrawAPI.updateScene).not.toHaveBeenCalled();
    expect(manager.pendingRemoteUpdates).toHaveLength(1);

    jest.advanceTimersByTime(PREVIEW_COMMIT_DELAY);

    const mergedElements = [{ id: 'local', version: 2 }, ...remoteElements];
    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledTimes(1);
    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledWith(
      mergedElements, 8, manager.sendOperationsCallback,
    );
    expect(manager.excalidrawAPI.updateScene).toHaveBeenCalledWith({
      elements: mergedElements, captureUpdate: CaptureUpdateAction.NEVER,
    });
    expect(manager.pendingRemoteUpdates).toEqual([]);
    expect(manager.previewElements).toBeNull();
    expect(manager.previewCommitTimer).toBeNull();

    manager.sendOperationsCallback({ success: true, version: 9 });
    manager.updatePreview(mergedElements);
    jest.advanceTimersByTime(PREVIEW_COMMIT_DELAY);
    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledTimes(1);
  });

  test('sends a local deletion made before the remote frame', () => {
    const remoteElements = [{ id: 'remote', version: 3 }];
    manager.handleRemoteSceneUpdated({ elements: remoteElements, version: 8 });
    sceneElements = [{ id: 'local', version: 2, isDeleted: true }];
    manager.updatePreview(sceneElements);
    jest.advanceTimersToNextFrame();
    manager.commitPreview();

    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledWith(
      [{ id: 'local', version: 2, isDeleted: true }, ...remoteElements],
      8,
      manager.sendOperationsCallback,
    );
  });

  test('applies a remote-only frame without scheduling a local broadcast', () => {
    manager.handleRemoteSceneUpdated({
      elements: [{ id: 'remote', version: 3 }], version: 8,
    });
    jest.advanceTimersToNextFrame();

    expect(manager.excalidrawAPI.updateScene).toHaveBeenCalledTimes(1);
    expect(sceneElements).toEqual([{ id: 'local', version: 1 }, { id: 'remote', version: 3 }]);
    expect(manager.getLastBroadcastedOrReceivedSceneVersion()).toBe(4);
    expect(manager.previewElements).toBeNull();
    jest.advanceTimersByTime(PREVIEW_COMMIT_DELAY);
    expect(manager.socketClient.broadcastSceneElements).not.toHaveBeenCalled();
  });

  test('merges out-of-order remote updates with a local edit before sending', () => {
    manager.handleRemoteSceneUpdated({
      elements: [{ id: 'remote', version: 5 }], version: 10,
    });
    manager.handleRemoteSceneUpdated({
      elements: [{ id: 'remote', version: 3 }], version: 8,
    });
    sceneElements = [{ id: 'local', version: 2 }];
    manager.updatePreview(sceneElements);
    jest.advanceTimersToNextFrame();
    manager.commitPreview();

    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledWith(
      [{ id: 'local', version: 2 }, { id: 'remote', version: 5 }],
      10,
      manager.sendOperationsCallback,
    );
    expect(manager.pendingRemoteUpdates).toEqual([]);
  });
});

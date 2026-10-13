import { CaptureUpdateAction, reconcileElements } from '@excalidraw/excalidraw';
import { PREVIEW_COMMIT_DELAY } from '../constants';
import SocketManager from './socket-manager';

jest.mock('@excalidraw/excalidraw', () => ({
  CaptureUpdateAction: { NEVER: 'never' },
  getSceneVersion: jest.fn(elements => elements.reduce((version, element) => version + element.version, 0)),
  restoreElements: jest.fn(elements => elements),
  reconcileElements: jest.fn((localElements, remoteElements) => {
    const elements = new Map(localElements.map(element => [element.id, element]));
    remoteElements.forEach(element => {
      const localElement = elements.get(element.id);
      if (!localElement || element.version > localElement.version) {
        elements.set(element.id, element);
      }
    });
    return Array.from(elements.values());
  }),
}));

jest.mock('./socket-client', () => jest.fn().mockImplementation(() => ({
  broadcastSceneElements: jest.fn(),
  close: jest.fn(),
})));

jest.mock('../data/file-manager', () => jest.fn());
jest.mock('../data/server-storage', () => ({}));
jest.mock('../utils/debug', () => ({ stateDebug: jest.fn() }));
jest.mock('../utils/element-utils', () => ({}));
jest.mock('../utils/exdraw-utils', () => ({}));

const createElements = (id, version) => [{ id, version }];

describe('SocketManager fast drawing', () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  let manager;
  let sceneElements;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    window.requestAnimationFrame = jest.fn(callback => setTimeout(callback, 16));
    window.cancelAnimationFrame = jest.fn(frame => clearTimeout(frame));
    sceneElements = [];
    manager = new SocketManager(
      {
        updateScene: jest.fn(({ elements }) => {
          if (elements) sceneElements = elements;
        }),
        getSceneElementsIncludingDeleted: jest.fn(() => sceneElements),
        getAppState: jest.fn(() => ({})),
      },
      { elements: [], version: 0 },
      { user: { _username: 'test-user' } },
    );
    manager.loadImageFiles = jest.fn();
    manager.excalidrawAPI.updateScene.mockClear();
  });

  afterEach(() => {
    manager.cancelRemoteSceneRender();
    jest.clearAllTimers();
    jest.useRealTimers();
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    SocketManager.instance = null;
  });

  test('commits only the latest snapshot after many rapid drawing changes', () => {
    for (let version = 1; version <= 1000; version += 1) {
      manager.updatePreview(createElements('stroke', version));
    }

    expect(manager.socketClient.broadcastSceneElements).not.toHaveBeenCalled();
    expect(manager.pendingOperationList).toEqual([]);

    manager.commitPreview();

    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledTimes(1);
    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledWith(
      createElements('stroke', 1000), 0, manager.sendOperationsCallback,
    );
    expect(manager.previewElements).toBeNull();
    expect(manager.previewCommitTimer).toBeNull();
  });

  test('preserves successive completed strokes while the first commit awaits acknowledgement', () => {
    manager.updatePreview(createElements('first-stroke', 1));
    manager.commitPreview();
    const completedScene = [
      ...createElements('first-stroke', 1),
      ...createElements('second-stroke', 1),
    ];
    manager.updatePreview(completedScene);
    manager.commitPreview();

    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledTimes(1);
    expect(manager.pendingOperationList).toEqual([completedScene]);

    manager.sendOperationsCallback({ success: true, version: 1 });

    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledTimes(2);
    expect(manager.socketClient.broadcastSceneElements).toHaveBeenLastCalledWith(
      completedScene, 1, manager.sendOperationsCallback,
    );
  });

  test('commits after drawing changes stop and resets the idle deadline on each change', () => {
    manager.updatePreview(createElements('stroke', 1));
    jest.advanceTimersByTime(PREVIEW_COMMIT_DELAY - 1);
    manager.updatePreview(createElements('stroke', 2));
    jest.advanceTimersByTime(PREVIEW_COMMIT_DELAY - 1);

    expect(manager.socketClient.broadcastSceneElements).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);

    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledWith(
      createElements('stroke', 2), 0, manager.sendOperationsCallback,
    );
  });

  test('ignores unchanged scenes and repeated flushes after a completed commit', () => {
    manager.updatePreview([]);
    expect(manager.previewCommitTimer).toBeNull();

    manager.updatePreview(createElements('stroke', 1));
    manager.commitPreview();
    manager.commitPreview();
    jest.advanceTimersByTime(PREVIEW_COMMIT_DELAY);

    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledTimes(1);
  });

  test('buffers remote updates during a stroke and merges them in version order before committing', () => {
    const localElements = createElements('local-stroke', 1);
    manager.updatePreview(localElements);
    manager.handleRemoteSceneUpdated({
      elements: createElements('remote-stroke', 5), version: 5, operation_id: 'remote-5',
    });
    manager.handleRemoteSceneUpdated({
      elements: createElements('remote-stroke', 3), version: 3, operation_id: 'remote-3',
    });

    expect(manager.excalidrawAPI.updateScene).not.toHaveBeenCalled();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();

    manager.commitPreview();

    const mergedElements = [...localElements, ...createElements('remote-stroke', 5)];
    expect(reconcileElements.mock.calls.map(call => call[1])).toEqual([
      createElements('remote-stroke', 3), createElements('remote-stroke', 5),
    ]);
    expect(manager.excalidrawAPI.updateScene).toHaveBeenCalledWith({
      elements: mergedElements, captureUpdate: CaptureUpdateAction.NEVER,
    });
    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledWith(
      mergedElements, 5, manager.sendOperationsCallback,
    );
    expect(manager.pendingRemoteUpdates).toEqual([]);
  });

  test('retains conflict updates received during a local stroke', () => {
    manager.updatePreview(createElements('local-stroke', 1));
    manager.updateLocalDataByRemoteData(createElements('remote-stroke', 2), 2);

    expect(manager.excalidrawAPI.updateScene).not.toHaveBeenCalled();

    manager.commitPreview();

    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledWith(
      [...createElements('local-stroke', 1), ...createElements('remote-stroke', 2)],
      2,
      manager.sendOperationsCallback,
    );
  });

  test('renders multiple remote updates only once per frame and ignores duplicate operations', () => {
    const remoteUpdate = {
      elements: createElements('remote-stroke', 1), version: 1, operation_id: 'remote-1',
    };
    manager.handleRemoteSceneUpdated(remoteUpdate);
    manager.handleRemoteSceneUpdated(remoteUpdate);
    manager.handleRemoteSceneUpdated({
      elements: createElements('remote-stroke', 2), version: 2, operationId: 'remote-2',
    });

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(manager.pendingRemoteUpdates).toHaveLength(2);
    expect(manager.excalidrawAPI.updateScene).not.toHaveBeenCalled();

    jest.advanceTimersByTime(16);

    expect(manager.excalidrawAPI.updateScene).toHaveBeenCalledTimes(1);
    expect(manager.excalidrawAPI.updateScene).toHaveBeenCalledWith({
      elements: createElements('remote-stroke', 2), captureUpdate: CaptureUpdateAction.NEVER,
    });
    expect(manager.loadImageFiles).toHaveBeenCalledTimes(1);
    expect(manager.getVersion()).toBe(2);
  });

  test('does not render a scheduled remote frame over a newly started local stroke', () => {
    manager.handleRemoteSceneUpdated({ elements: createElements('remote-stroke', 1), version: 1 });
    manager.updatePreview(createElements('local-stroke', 2));
    jest.advanceTimersByTime(16);

    expect(manager.excalidrawAPI.updateScene).not.toHaveBeenCalled();
    expect(manager.pendingRemoteUpdates).toHaveLength(1);

    manager.commitPreview();

    expect(manager.excalidrawAPI.updateScene).toHaveBeenCalledWith({
      elements: [...createElements('local-stroke', 2), ...createElements('remote-stroke', 1)],
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  });

  test('flushes the final local preview when the connection is lost', () => {
    manager.updatePreview(createElements('stroke', 1));
    manager.dispatchConnectState('disconnect');

    expect(manager.previewElements).toBeNull();
    expect(manager.pendingOperationList).toEqual([createElements('stroke', 1)]);
    expect(manager.state).toBe('disconnect');
  });

  test('flushes the final preview and cancels pending remote rendering on destruction', () => {
    manager.handleRemoteSceneUpdated({ elements: createElements('remote-stroke', 1), version: 1 });
    manager.updatePreview(createElements('local-stroke', 2));
    SocketManager.instance = manager;

    SocketManager.destroy();

    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledTimes(1);
    expect(manager.socketClient.close).toHaveBeenCalledTimes(1);
    expect(manager.previewElements).toBeNull();
    expect(manager.remoteRenderFrame).toBeNull();
    expect(SocketManager.instance).toBeNull();
    const renderCount = manager.excalidrawAPI.updateScene.mock.calls.length;
    jest.advanceTimersByTime(PREVIEW_COMMIT_DELAY);
    expect(manager.excalidrawAPI.updateScene).toHaveBeenCalledTimes(renderCount);
  });
});

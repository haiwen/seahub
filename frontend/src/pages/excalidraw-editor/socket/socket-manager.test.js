import { CaptureUpdateAction } from '@excalidraw/excalidraw';
import { PREVIEW_COMMIT_DELAY } from '../constants';
import SocketManager from './socket-manager';

jest.mock('@excalidraw/excalidraw', () => ({
  CaptureUpdateAction: { NEVER: 'never' },
  getSceneVersion: elements => elements.reduce((version, element) => version + element.version, 0),
  restoreElements: elements => elements,
  reconcileElements: (localElements, remoteElements, appState) => {
    const elements = new Map(localElements.map(element => [element.id, element]));
    remoteElements.forEach(element => {
      const localElement = elements.get(element.id);
      const isEditing = localElement && (
        element.id === appState.editingTextElement?.id ||
        element.id === appState.resizingElement?.id ||
        element.id === appState.newElement?.id
      );
      if (!localElement || (!isEditing && (
        element.version > localElement.version ||
        (element.version === localElement.version && element.versionNonce < localElement.versionNonce)
      ))) {
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
  let appState;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    sceneElements = [{ id: 'local', version: 1 }];
    appState = {};
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
        getAppState: jest.fn(() => appState),
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

  test.each([
    [0, false],
    [1, false],
    [2, true],
  ])('detects unsynced changes for scene version %i relative to the baseline', (sceneVersion, expected) => {
    manager.setVersion(8);

    expect(manager.hasUnsyncedSceneChanges([{ id: 'local', version: sceneVersion }])).toBe(expected);
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

  test.each([
    [5, 1, false],
    [3, 1, false],
    [5, 1, true],
  ])('preserves the final local text after editing ends (remote version %i, nonce %i, deleted %s)', (remoteVersion, remoteNonce, isDeleted) => {
    sceneElements = [{ id: 'local', type: 'text', version: 2, versionNonce: 10, text: 'draft' }];
    appState.editingTextElement = sceneElements[0];
    manager.updatePreview(sceneElements);
    const remoteElements = [
      { id: 'local', type: 'text', version: remoteVersion, versionNonce: remoteNonce, text: 'remote' },
      { id: 'remote', version: 1 },
    ];
    manager.handleRemoteSceneUpdated({ elements: remoteElements, version: 8 });

    // Finish typing and clear the same app-state object before the delayed commit.
    sceneElements = [{ id: 'local', type: 'text', version: 3, versionNonce: 10, text: 'final input', isDeleted }];
    const finalLocalElement = sceneElements[0];
    appState.editingTextElement = null;
    manager.updatePreview(sceneElements);
    jest.advanceTimersByTime(PREVIEW_COMMIT_DELAY);

    const mergedElements = [finalLocalElement, remoteElements[1]];
    expect(sceneElements).toEqual(mergedElements);
    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledWith(
      mergedElements, 8, manager.sendOperationsCallback,
    );
    expect(manager.pendingRemoteUpdates).toEqual([]);
  });

  test('preserves both the receive-time text and elements being edited at commit time', () => {
    sceneElements = [
      { id: 'local', version: 2, text: 'first draft' },
      { id: 'other-text', version: 2, text: 'second draft' },
      { id: 'resizing', version: 2 },
      { id: 'new', version: 2 },
    ];
    appState.editingTextElement = sceneElements[0];
    manager.updatePreview(sceneElements);
    manager.handleRemoteSceneUpdated({
      elements: sceneElements.map(element => ({ ...element, version: 5, text: 'remote' })),
      version: 8,
    });

    appState.editingTextElement = sceneElements[1];
    appState.resizingElement = sceneElements[2];
    appState.newElement = sceneElements[3];
    const localElements = sceneElements;
    manager.commitPreview();

    expect(sceneElements).toEqual(localElements);
    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledWith(
      localElements, 8, manager.sendOperationsCallback,
    );
  });

  test('limits receive-time protection to its update and accepts later remote text changes', () => {
    sceneElements = [{ id: 'local', version: 2, text: 'draft' }];
    appState.editingTextElement = sceneElements[0];
    manager.updatePreview(sceneElements);
    manager.handleRemoteSceneUpdated({
      elements: [{ id: 'local', version: 5, text: 'earlier remote' }], version: 8,
    });
    appState.editingTextElement = null;
    const laterRemoteElement = { id: 'local', version: 6, text: 'later remote' };
    manager.handleRemoteSceneUpdated({ elements: [laterRemoteElement], version: 9 });
    manager.commitPreview();

    expect(sceneElements).toEqual([laterRemoteElement]);
    expect(manager.pendingRemoteUpdates).toEqual([]);
    manager.sendOperationsCallback({ success: true, version: 10 });

    const latestRemoteElement = { id: 'local', version: 7, text: 'latest remote' };
    manager.handleRemoteSceneUpdated({ elements: [latestRemoteElement], version: 11 });
    jest.advanceTimersToNextFrame();
    expect(sceneElements).toEqual([latestRemoteElement]);
    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledTimes(1);
  });

  test('preserves receive-time text protection when the remote frame runs after editing ends', () => {
    appState.editingTextElement = sceneElements[0];
    manager.handleRemoteSceneUpdated({
      elements: [{ id: 'local', version: 5 }, { id: 'remote', version: 2 }], version: 8,
    });
    appState.editingTextElement = null;
    jest.advanceTimersToNextFrame();

    expect(sceneElements).toEqual([{ id: 'local', version: 1 }, { id: 'remote', version: 2 }]);
    expect(manager.socketClient.broadcastSceneElements).not.toHaveBeenCalled();
  });

  test('does not discard a protected remote text element absent from the local scene', () => {
    appState.editingTextElement = { id: 'remote-text' };
    const remoteTextElement = { id: 'remote-text', type: 'text', version: 2, text: 'remote' };
    manager.handleRemoteSceneUpdated({ elements: [remoteTextElement], version: 8 });
    appState.editingTextElement = null;
    jest.advanceTimersToNextFrame();

    expect(sceneElements).toEqual([{ id: 'local', version: 1 }, remoteTextElement]);
  });

  test('preserves receive-time text protection for a queued conflict update', () => {
    sceneElements = [{ id: 'local', version: 2, text: 'draft' }];
    appState.editingTextElement = sceneElements[0];
    manager.updatePreview(sceneElements);
    manager.updateLocalDataByRemoteData([{ id: 'local', version: 5, text: 'remote' }], 8);
    appState.editingTextElement = null;
    manager.commitPreview();

    expect(sceneElements).toEqual([{ id: 'local', version: 2, text: 'draft' }]);
    expect(manager.socketClient.broadcastSceneElements).toHaveBeenCalledWith(
      sceneElements, 8, manager.sendOperationsCallback,
    );
  });
});

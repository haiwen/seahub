import PreviewManager from './preview-manager';

jest.mock('@excalidraw/excalidraw', () => ({
  CaptureUpdateAction: { NEVER: 'never' },
  restoreElements: (elements) => elements,
}));

jest.mock('lodash.throttle', () => (callback) => {
  const throttled = (...args) => callback(...args);
  throttled.flush = jest.fn();
  return throttled;
});

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'gesture-1'),
}));

jest.mock('../utils/debug', () => ({
  gestureDebug: jest.fn(),
}));

const createManager = () => {
  let scene = [{ id: 'element-1', version: 1, versionNonce: 1 }];
  let appState = {};
  const excalidrawAPI = {
    getSceneElementsIncludingDeleted: jest.fn(() => scene),
    getAppState: jest.fn(() => appState),
    updateScene: jest.fn(({ elements }) => {
      scene = elements;
    }),
  };
  const socketClient = {
    broadcastPreviewElements: jest.fn(),
  };
  const onCommit = jest.fn();
  const manager = new PreviewManager(excalidrawAPI, socketClient, onCommit);

  return {
    manager,
    excalidrawAPI,
    socketClient,
    onCommit,
    setScene: (elements) => {
      scene = elements;
    },
    setAppState: (nextAppState) => {
      appState = nextAppState;
    },
  };
};

const dragAppState = {
  activeTool: { type: 'selection' },
  selectedElementsAreBeingDragged: true,
  selectedElementIds: { 'element-1': true },
};

describe('PreviewManager PointerUp finalization', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const startDrag = (context) => {
    context.setAppState(dragAppState);
    context.manager.handlePointerDown(
      { type: 'selection' },
      { hit: { element: { id: 'element-1' } } },
    );
    context.manager.updateGesture(
      context.excalidrawAPI.getSceneElementsIncludingDeleted(),
      dragAppState,
    );
    context.manager.handlePointerUp({ type: 'selection' }, {});
  };

  it('commits after PointerUp when no later onChange is emitted', () => {
    const context = createManager();
    startDrag(context);

    jest.advanceTimersByTime(99);
    expect(context.onCommit).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);

    expect(context.onCommit).toHaveBeenCalledTimes(1);
    expect(context.onCommit).toHaveBeenCalledWith([
      { id: 'element-1', version: 1, versionNonce: 1 },
    ]);
    expect(context.manager.activeGesture).toBeNull();
  });

  it('uses the latest scene when it is available before the fallback timer', () => {
    const context = createManager();
    startDrag(context);
    const finalScene = [{ id: 'element-1', version: 2, versionNonce: 2 }];
    context.setScene(finalScene);

    jest.advanceTimersByTime(100);

    expect(context.onCommit).toHaveBeenCalledWith(finalScene);
    expect(context.onCommit).toHaveBeenCalledTimes(1);
  });

  it('cancels fallback finalization after the final onChange commit', () => {
    const context = createManager();
    startDrag(context);
    const finalScene = [{ id: 'element-1', version: 2, versionNonce: 2 }];
    context.setScene(finalScene);
    const result = context.manager.updateGesture(finalScene, {});

    expect(result.ended).toBe(true);
    context.manager.commitGesture(finalScene, result.gesture, result.endReason);
    jest.advanceTimersByTime(100);

    expect(context.onCommit).toHaveBeenCalledWith(finalScene);
    expect(context.onCommit).toHaveBeenCalledTimes(1);
    expect(context.manager.activeGesture).toBeNull();
  });

  it('does not commit the same gesture twice when flushed before the timer', () => {
    const context = createManager();
    startDrag(context);

    expect(context.manager.flushPendingGesture('disconnect')).toBe(true);
    jest.advanceTimersByTime(100);

    expect(context.onCommit).toHaveBeenCalledTimes(1);
    expect(context.manager.activeGesture).toBeNull();
  });

  it('does not create a pending finalization for text editing', () => {
    const context = createManager();
    context.setAppState({
      activeTool: { type: 'text' },
      editingTextElement: { id: 'element-1' },
    });
    context.manager.handlePointerDown({ type: 'text' }, {});
    context.manager.handlePointerUp({ type: 'text' }, {});

    jest.advanceTimersByTime(100);

    expect(context.onCommit).not.toHaveBeenCalled();
    expect(context.manager.activeGesture).not.toBeNull();
    expect(context.manager.activeGesture.type).toBe('edit-text');
  });
});

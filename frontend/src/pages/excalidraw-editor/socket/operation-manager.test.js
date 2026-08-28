import OperationManager from './operation-manager';
import {
  OPERATION_MAX_RETRIES,
  OPERATION_RETRY_DELAY,
} from '../constants';

jest.mock('@excalidraw/excalidraw', () => ({
  CaptureUpdateAction: { NEVER: 'never' },
  getSceneVersion: (elements) => Math.max(0, ...elements.map(({ version = 0 }) => version)),
  reconcileElements: jest.fn(),
  restoreElements: jest.fn(),
}));

jest.mock('../utils/debug', () => ({
  stateDebug: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'retry-uuid'),
}));

const createManager = () => {
  const socketClient = {
    broadcastSceneElements: jest.fn(),
  };
  const onStateChange = jest.fn();
  const manager = new OperationManager({
    excalidrawAPI: {
      getSceneElementsIncludingDeleted: jest.fn(() => []),
      getAppState: jest.fn(() => ({})),
      updateScene: jest.fn(),
    },
    document: {
      elements: [],
      version: 0,
    },
    socketClient,
    getElementsWithoutRemotePreview: (elements) => elements,
    clearRemotePreviewRecords: jest.fn(),
    clearPendingRemotePreviewChange: jest.fn(),
    loadImageFiles: jest.fn(),
    onStateChange,
  });

  return { manager, socketClient, onStateChange };
};

const createQueueItem = (retryCount = 0) => ({
  uuid: `queue-${retryCount}`,
  operation: [{ id: 'element-1', version: 1 }],
  beginTime: 1,
  retryCount,
});

describe('OperationManager retry policy', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('stops retrying after the ACK retry budget is exhausted', () => {
    const { manager, socketClient, onStateChange } = createManager();
    const queueItem = createQueueItem(OPERATION_MAX_RETRIES);
    manager.state = 'sending';
    manager._sendingOperation = queueItem;

    manager.sendOperationsCallback({ error_type: 'ack_timeout' }, queueItem);

    expect(manager.state).toBe('need_reload');
    expect(manager._sendingOperation).toBeNull();
    expect(manager.pendingOperationQueue).toHaveLength(1);
    expect(manager.pendingOperationQueue[0].retryCount).toBe(OPERATION_MAX_RETRIES + 1);
    expect(onStateChange).toHaveBeenCalledWith('sync_server_operations_error', undefined);

    jest.runOnlyPendingTimers();
    expect(socketClient.broadcastSceneElements).not.toHaveBeenCalled();
  });

  it('uses a delayed retry for an ACK timeout', () => {
    const { manager, socketClient } = createManager();
    const queueItem = createQueueItem();
    manager.state = 'sending';
    manager._sendingOperation = queueItem;

    manager.sendOperationsCallback({ error_type: 'ack_timeout' }, queueItem);

    expect(manager.state).toBe('idle');
    expect(manager.pendingOperationQueue[0].retryCount).toBe(1);
    expect(socketClient.broadcastSceneElements).not.toHaveBeenCalled();

    jest.advanceTimersByTime(OPERATION_RETRY_DELAY - 1);
    expect(socketClient.broadcastSceneElements).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(socketClient.broadcastSceneElements).toHaveBeenCalledTimes(1);
    expect(manager._sendingOperation.retryCount).toBe(1);
  });

  it('uses the exponential delay for the second retry', () => {
    const { manager, socketClient } = createManager();
    const queueItem = createQueueItem(1);
    manager.state = 'sending';
    manager._sendingOperation = queueItem;

    manager.sendOperationsCallback({ error_type: 'ack_timeout' }, queueItem);

    expect(manager.state).toBe('idle');
    expect(manager.pendingOperationQueue[0].retryCount).toBe(2);
    expect(socketClient.broadcastSceneElements).not.toHaveBeenCalled();

    jest.advanceTimersByTime(OPERATION_RETRY_DELAY * 2 - 1);
    expect(socketClient.broadcastSceneElements).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(socketClient.broadcastSceneElements).toHaveBeenCalledTimes(1);
    expect(manager._sendingOperation.retryCount).toBe(2);
  });

  it('resets retry budgets when the connection is ready again', () => {
    const { manager, socketClient } = createManager();
    manager.state = 'disconnect';
    manager.pendingOperationQueue.push(createQueueItem(OPERATION_MAX_RETRIES));

    manager.handleConnectState('reconnect');

    expect(socketClient.broadcastSceneElements).toHaveBeenCalledTimes(1);
    expect(manager._sendingOperation.retryCount).toBe(0);
  });
});

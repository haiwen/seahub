import { MAX_OPERATION_RETRIES } from '../constants';
import SocketManager from './socket-manager';

jest.mock('./socket-client', () => jest.fn().mockImplementation(() => ({
  close: jest.fn(),
})));

jest.mock('@excalidraw/excalidraw', () => ({
  CaptureUpdateAction: { NEVER: 'never' },
  getSceneVersion: jest.fn(() => 0),
  reconcileElements: jest.fn(),
  restoreElements: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'operation-id'),
}));

describe('SocketManager operation retries', () => {
  const createManager = () => new SocketManager(
    {
      updateScene: jest.fn(),
      getSceneElementsIncludingDeleted: jest.fn(() => []),
    },
    {
      elements: [],
      version: 0,
    },
    {
      user: { _username: 'test-user' },
    },
  );

  afterEach(() => {
    SocketManager.destroy();
  });

  test('retries a failed operation at most three times', () => {
    const manager = createManager();
    const operation = { operation_id: 'operation-1', retryCount: 0 };
    manager.dispatchConnectState = jest.fn();
    manager.state = 'sending';

    for (let retryCount = 1; retryCount <= MAX_OPERATION_RETRIES; retryCount += 1) {
      manager._sendingOperation = operation;

      expect(manager.recoverSendingOperation('execute_client_operations_error')).toBe(true);
      expect(operation.retryCount).toBe(retryCount);
      expect(manager.pendingOperationList).toEqual([operation]);
      manager.pendingOperationList.shift();
    }

    manager._sendingOperation = operation;

    expect(manager.recoverSendingOperation('execute_client_operations_error')).toBe(false);
    expect(operation.retryCount).toBe(MAX_OPERATION_RETRIES + 1);
    expect(manager.pendingOperationList).toEqual([]);
    expect(manager._sendingOperation).toBeNull();
  });

  test('continues with the next operation after the retry limit is reached', () => {
    const manager = createManager();
    const nextOperation = { operation_id: 'operation-2', retryCount: 0 };
    manager.dispatchConnectState = jest.fn();
    manager.sendNextOperations = jest.fn();
    manager.state = 'sending';
    manager._sendingOperation = {
      operation_id: 'operation-1',
      retryCount: MAX_OPERATION_RETRIES,
    };
    manager.pendingOperationList = [nextOperation];

    manager.handleOperationError({ error_type: 'execute_client_operations_error' });

    expect(manager._sendingOperation).toBeNull();
    expect(manager.pendingOperationList).toEqual([nextOperation]);
    expect(manager.state).toBe('sending');
    expect(manager.sendNextOperations).toHaveBeenCalledTimes(1);
  });
});

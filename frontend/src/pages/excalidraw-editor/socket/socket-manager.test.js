import SocketManager from './socket-manager';

jest.mock('@excalidraw/excalidraw', () => ({}));
jest.mock('lodash.throttle', () => (callback) => callback);
jest.mock('./socket-client', () => jest.fn());
jest.mock('./preview-manager', () => jest.fn());
jest.mock('./operation-manager', () => jest.fn());
jest.mock('../utils/event-bus', () => ({
  getInstance: jest.fn(),
}));
jest.mock('../data/file-manager', () => jest.fn());
jest.mock('../data/server-storage', () => ({
  loadFilesFromServer: jest.fn(),
  saveFilesToServer: jest.fn(),
}));
jest.mock('../utils/exdraw-utils', () => ({
  updateStaleImageStatuses: jest.fn(),
}));
jest.mock('../utils/element-utils', () => ({
  isInitializedImageElement: jest.fn(),
}));

describe('SocketManager connection state forwarding', () => {
  it('forwards the state message to OperationManager and EventBus', () => {
    const manager = new SocketManager(
      { updateScene: jest.fn() },
      { elements: [] },
      { user: { _username: 'user-1' } },
    );
    const operationManager = {
      handleConnectState: jest.fn(),
    };
    const eventBus = {
      dispatch: jest.fn(),
    };
    const message = {
      error_type: 'ack_timeout',
      retry_count: 3,
    };
    manager.operationManager = operationManager;
    manager.eventBus = eventBus;

    manager.dispatchConnectState('join-room-failed', message);

    expect(operationManager.handleConnectState).toHaveBeenCalledWith('join-room-failed', message);
    expect(eventBus.dispatch).toHaveBeenCalledWith('join-room-failed', message);
  });
});

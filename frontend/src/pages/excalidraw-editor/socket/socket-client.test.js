import io from 'socket.io-client';
import { OPERATION_ACK_TIMEOUT } from '../constants';
import SocketClient from './socket-client';
import SocketManager from './socket-manager';

jest.mock('socket.io-client', () => jest.fn());
jest.mock('@excalidraw/excalidraw', () => ({}));
jest.mock('../data', () => ({ isSyncableElement: () => true }));
jest.mock('../utils/debug', () => ({ clientDebug: jest.fn(), serverDebug: jest.fn() }));
jest.mock('../utils/element-utils', () => ({}));
jest.mock('./socket-manager', () => ({ getInstance: jest.fn() }));

describe('SocketClient operation acknowledgements', () => {
  let client;
  let socket;
  let manager;
  const elements = [{ id: 'local', version: 2 }];

  beforeEach(() => {
    jest.clearAllMocks();
    socket = {
      on: jest.fn(),
      io: { on: jest.fn() },
      timeout: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      connect: jest.fn(),
    };
    manager = {
      dispatchConnectState: jest.fn(),
      receiveRoomUserChanged: jest.fn(),
    };
    io.mockReturnValue(socket);
    SocketManager.getInstance.mockReturnValue(manager);
    client = new SocketClient({ docUuid: 'document-id', user: { _username: 'test-user' } });
    client.queueFileUpload = jest.fn();
  });

  test('sets a bounded ACK timeout and includes the operation id', () => {
    client.broadcastSceneElements(elements, 1, 'operation-1', jest.fn());

    expect(socket.timeout).toHaveBeenCalledWith(OPERATION_ACK_TIMEOUT);
    expect(socket.emit).toHaveBeenCalledWith('elements-updated', expect.objectContaining({
      elements, version: 1, operation_id: 'operation-1', doc_uuid: 'document-id',
    }), expect.any(Function));
    expect(client.broadcastedElementVersions.size).toBe(0);
  });

  test.each([
    [new Error('timeout'), undefined, { error_type: 'ack_timeout' }],
    [null, { error_type: 'execute_client_operations_error' }, { error_type: 'execute_client_operations_error' }],
    [null, undefined, undefined],
    [null, { success: true, operation_id: 'another-operation' }, { error_type: 'sync_server_operations_error' }],
  ])('does not suppress retry elements after an unconfirmed ACK (%j, %j)', (error, result, expected) => {
    const callback = jest.fn();
    client.broadcastSceneElements(elements, 1, 'operation-1', callback);
    socket.emit.mock.calls[0][2](error, result);

    expect(callback).toHaveBeenCalledWith(expected);
    expect(client.broadcastedElementVersions.size).toBe(0);
    client.broadcastSceneElements(elements, 1, 'operation-1', callback);
    expect(socket.emit.mock.calls[1][1].elements).toEqual(elements);
  });

  test.each([
    { success: true, version: 2 },
    { success: true, version: 2, operation_id: 'operation-1' },
    { success: true, version: 2, operationId: 'operation-1' },
  ])('records versions only after a matching success ACK: %j', result => {
    const callback = jest.fn();
    client.broadcastSceneElements(elements, 1, 'operation-1', callback);
    socket.emit.mock.calls[0][2](null, result);

    expect(callback).toHaveBeenCalledWith(result);
    expect(client.broadcastedElementVersions.get('local')).toBe(2);
    client.broadcastSceneElements(elements, 2, 'operation-2', callback);
    expect(socket.emit.mock.calls[1][1].elements).toEqual([]);
  });

  test('does not mark in-place edits made while awaiting the ACK as broadcasted', () => {
    const mutableElements = [{ id: 'local', version: 2 }];
    client.broadcastSceneElements(mutableElements, 1, 'operation-1', jest.fn());
    mutableElements[0].version = 3;
    socket.emit.mock.calls[0][2](null, { success: true, version: 2 });

    expect(client.broadcastedElementVersions.get('local')).toBe(2);
    client.broadcastSceneElements(mutableElements, 2, 'operation-2', jest.fn());
    expect(socket.emit.mock.calls[1][1].elements).toEqual(mutableElements);
  });

  test('requeues operations before reconnecting after a ping timeout', () => {
    socket.connect.mockImplementation(() => {
      expect(manager.dispatchConnectState).toHaveBeenCalledWith('disconnect', 'ping timeout');
    });
    client.onDisconnected('ping timeout');
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  test('confirms room membership after receiving its users', () => {
    const users = [{ _username: 'test-user' }];
    manager.dispatchConnectState.mockImplementation(() => {
      expect(manager.receiveRoomUserChanged).toHaveBeenCalledWith(users);
    });
    client.onRoomUserChanged(users);
    expect(manager.dispatchConnectState).toHaveBeenCalledWith('room-joined');
  });
});

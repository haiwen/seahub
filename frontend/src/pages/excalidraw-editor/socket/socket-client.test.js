import SocketClient from './socket-client';
import io from 'socket.io-client';
import SocketManager from './socket-manager';
import {
  JOIN_ROOM_ACK_TIMEOUT,
  JOIN_ROOM_MAX_RETRIES,
  JOIN_ROOM_RETRY_DELAY,
} from '../constants';

jest.mock('socket.io-client', () => jest.fn());
jest.mock('@excalidraw/excalidraw', () => ({
  CaptureUpdateAction: { NEVER: 'never' },
  newElementWith: jest.fn(),
}));
jest.mock('../utils/debug', () => ({
  clientDebug: jest.fn(),
  serverDebug: jest.fn(),
}));
jest.mock('./socket-manager', () => ({
  getInstance: jest.fn(),
}));
jest.mock('../data', () => ({
  isSyncableElement: jest.fn(() => true),
}));
jest.mock('../utils/element-utils', () => ({
  getFilename: jest.fn(),
}));

const createSocket = () => {
  let joinRoomAck;
  const socket = {
    connected: true,
    io: {
      on: jest.fn(),
    },
    on: jest.fn(),
    timeout: jest.fn(() => socket),
    emit: jest.fn((event, payload, callback) => {
      if (event === 'join-room') {
        joinRoomAck = callback;
      }
    }),
    volatile: {
      emit: jest.fn(),
    },
    close: jest.fn(),
    invokeJoinRoomAck: (...args) => joinRoomAck(...args),
  };
  return socket;
};

const createClient = () => {
  const socket = createSocket();
  const socketManager = {
    dispatchConnectState: jest.fn(),
    receiveRoomUserChanged: jest.fn(),
  };
  SocketManager.getInstance.mockReturnValue(socketManager);
  io.mockReturnValue(socket);
  const client = new SocketClient({
    exdrawServer: 'http://localhost',
    accessToken: 'token',
    docUuid: 'doc-1',
    user: { _username: 'user-1' },
  });
  return { client, socket, socketManager };
};

describe('SocketClient join-room handshake', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    io.mockClear();
    SocketManager.getInstance.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('marks the room ready only after a successful ACK', () => {
    const { client, socket, socketManager } = createClient();

    client.onInitRoom();
    expect(socket.timeout).toHaveBeenCalledWith(JOIN_ROOM_ACK_TIMEOUT);
    expect(socket.emit).toHaveBeenCalledWith(
      'join-room',
      expect.objectContaining({ doc_uuid: 'doc-1' }),
      expect.any(Function),
    );

    client.onRoomUserChanged([]);
    expect(socketManager.dispatchConnectState).not.toHaveBeenCalledWith('room-ready', expect.anything());

    socket.invokeJoinRoomAck(null, { success: true });

    expect(client.isRoomReady).toBe(true);
    expect(client.isJoiningRoom).toBe(false);
    expect(client.joinRoomRetryCount).toBe(0);
    expect(socketManager.dispatchConnectState).toHaveBeenCalledWith('room-ready', { success: true });
  });

  it('retries after an ACK timeout with exponential backoff', () => {
    const { client, socket } = createClient();

    client.onInitRoom();
    socket.invokeJoinRoomAck(new Error('timeout'));

    expect(socket.emit).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(JOIN_ROOM_RETRY_DELAY - 1);
    expect(socket.emit).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    expect(socket.emit).toHaveBeenCalledTimes(2);

    socket.invokeJoinRoomAck(new Error('timeout'));
    jest.advanceTimersByTime(JOIN_ROOM_RETRY_DELAY * 2 - 1);
    expect(socket.emit).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(1);
    expect(socket.emit).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable join-room errors', () => {
    const { client, socket, socketManager } = createClient();

    client.onInitRoom();
    socket.invokeJoinRoomAck(null, {
      success: false,
      error_type: 'invalid_join_room',
    });

    expect(socket.emit).toHaveBeenCalledTimes(1);
    expect(client.isJoiningRoom).toBe(false);
    expect(socketManager.dispatchConnectState).toHaveBeenCalledWith(
      'join-room-failed',
      expect.objectContaining({
        error_type: 'invalid_join_room',
        retry_count: 0,
      }),
    );
  });

  it('stops retrying and reports failure after the retry budget is exhausted', () => {
    const { client, socket, socketManager } = createClient();

    client.onInitRoom();
    for (let retry = 0; retry <= JOIN_ROOM_MAX_RETRIES; retry += 1) {
      socket.invokeJoinRoomAck(new Error('timeout'));
      if (retry < JOIN_ROOM_MAX_RETRIES) {
        jest.advanceTimersByTime(JOIN_ROOM_RETRY_DELAY * (2 ** retry));
      }
    }

    expect(socket.emit).toHaveBeenCalledTimes(JOIN_ROOM_MAX_RETRIES + 1);
    expect(client.isJoiningRoom).toBe(false);
    expect(client.isRoomReady).toBe(false);
    expect(socketManager.dispatchConnectState).toHaveBeenCalledWith(
      'join-room-failed',
      expect.objectContaining({
        error_type: 'ack_timeout',
        retry_count: JOIN_ROOM_MAX_RETRIES + 1,
      }),
    );

    jest.advanceTimersByTime(JOIN_ROOM_RETRY_DELAY * 16);
    expect(socket.emit).toHaveBeenCalledTimes(JOIN_ROOM_MAX_RETRIES + 1);
  });

  it('ignores a stale ACK after disconnect', () => {
    const { client, socket, socketManager } = createClient();

    client.onInitRoom();
    const staleAck = socket.invokeJoinRoomAck;
    client.onDisconnected('transport close');
    staleAck(null, { success: true });

    expect(client.isRoomReady).toBe(false);
    expect(socketManager.dispatchConnectState).not.toHaveBeenCalledWith('room-ready', expect.anything());
  });
});

import os
import socket

from pysearpc.errors import NetworkError

def recvall(fd, total):
    remain = total
    data = bytearray()
    while remain > 0:
        try:
            new = fd.recv(remain)
        except socket.error as e:
            raise NetworkError('Failed to read from socket: %s' % e)

        n = len(new)
        if n <= 0:
            raise NetworkError("Failed to read from socket")
        else:
            data.extend(new)
            remain -= n

    return bytes(data)

def sendall(fd, data):
    total = len(data)
    offset = 0
    while offset < total:
        try:
            n = fd.send(data[offset:])
        except socket.error as e:
            raise NetworkError('Failed to write to socket: %s' % e)

        if n <= 0:
            raise NetworkError('Failed to write to socket')
        else:
            offset += n

def is_win32():
    return os.name == 'nt'

def make_socket_closeonexec(fd):
    if not is_win32():
        import fcntl
        old_flags = fcntl.fcntl(fd, fcntl.F_GETFD)
        fcntl.fcntl(fd, fcntl.F_SETFD, old_flags | fcntl.FD_CLOEXEC)

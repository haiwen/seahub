"""
RPC client/server implementation based on named pipe transport.
"""

import json
import logging
import os
import socket
import struct
from threading import Thread
import queue

from .client import SearpcClient
from .server import searpc_server
from .transport import SearpcTransport
from .utils import make_socket_closeonexec, recvall, sendall

logger = logging.getLogger(__name__)


class NamedPipeException(Exception):
    pass


class NamedPipeTransport(SearpcTransport):
    """
    This transport uses named pipes on windows and unix domain socket
    on linux/mac.

    It's compatible with the c implementation of named pipe transport.
    in lib/searpc-named-pipe-transport.[ch] files.

    The protocol is:
    - request: <32b length header><json request>
    - response: <32b length header><json response>
    """

    def __init__(self, socket_path):
        self.socket_path = socket_path
        self.pipe = None

    def connect(self):
        self.pipe = socket.socket(socket.AF_UNIX)
        self.pipe.connect(self.socket_path)

    def stop(self):
        if self.pipe:
            self.pipe.close()
            self.pipe = None

    def send(self, service, fcall_str):
        body = json.dumps({
            'service': service,
            'request': fcall_str,
        })
        body_utf8 = body.encode(encoding='utf-8')
        # "I" for unsiged int
        header = struct.pack('=I', len(body_utf8))
        sendall(self.pipe, header)
        sendall(self.pipe, body_utf8)

        resp_header = recvall(self.pipe, 4)
        # logger.info('resp_header is %s', resp_header)
        resp_size, = struct.unpack('=I', resp_header)
        # logger.info('resp_size is %s', resp_size)
        resp = recvall(self.pipe, resp_size)
        # logger.info('resp is %s', resp)
        return resp.decode(encoding='utf-8')


class NamedPipeClient(SearpcClient):
    def __init__(self, socket_path, service_name, pool_size=5):
        self.socket_path = socket_path
        self.service_name = service_name
        self.pool_size = pool_size
        self._pool = queue.Queue(pool_size)

    def _create_transport(self):
        transport = NamedPipeTransport(self.socket_path)
        transport.connect()
        return transport

    def _get_transport(self):
        try:
            transport = self._pool.get(False)
        except:
            transport = self._create_transport()
        return transport

    def _return_transport(self, transport):
        try:
            self._pool.put(transport, False)
        except queue.Full:
            transport.stop()

    def call_remote_func_sync(self, fcall_str):
        transport = self._get_transport()
        ret_str = transport.send(self.service_name, fcall_str)
        self._return_transport(transport)
        return ret_str


class NamedPipeServer(object):
    """
    Searpc server based on named pipe transport. Note this server is
    very basic and is written for testing purpose only.
    """
    def __init__(self, socket_path):
        self.socket_path = socket_path
        self.pipe = None
        self.thread = Thread(target=self.accept_loop)
        self.thread.setDaemon(True)

    def start(self):
        self.init_socket()
        self.thread.start()

    def stop(self):
        pass

    def init_socket(self):
        if os.path.exists(self.socket_path):
            try:
                os.unlink(self.socket_path)
            except OSError:
                raise NamedPipeException(
                    'Failed to remove existing unix socket {}'.
                    format(self.socket_path)
                )
        self.pipe = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM, 0)
        make_socket_closeonexec(self.pipe)
        self.pipe.bind(self.socket_path)
        self.pipe.listen(10)
        logger.info('Server now listening at %s', self.socket_path)

    def accept_loop(self):
        logger.info('Waiting for clients')
        while True:
            connfd, _ = self.pipe.accept()
            logger.info('New pip client')
            t = PipeHandlerThread(connfd)
            t.start()


class PipeHandlerThread(Thread):
    def __init__(self, pipe):
        Thread.__init__(self)
        self.setDaemon(True)
        self.pipe = pipe

    def run(self):
        while True:
            req_header = recvall(self.pipe, 4)
            # logger.info('Got req header %s', req_header)
            req_size, = struct.unpack('I', req_header)
            # logger.info('req size is %s', req_size)
            req = recvall(self.pipe, req_size)
            # logger.info('req is %s', req)

            data = json.loads(req.decode(encoding='utf-8'))
            resp = searpc_server.call_function(data['service'], data['request'])
            # logger.info('resp is %s', resp)

            resp_header = struct.pack('I', len(resp))
            sendall(self.pipe, resp_header)
            sendall(self.pipe, resp.encode(encoding='utf-8'))

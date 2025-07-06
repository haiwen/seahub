"""
RPC client implementation based on TCP transport.
"""

import json
import logging
import socket
import struct
import queue
import platform

from .client import SearpcClient
from .transport import SearpcTransport
from .utils import recvall, sendall

logger = logging.getLogger(__name__)


class TcpTransportException(Exception):
    pass


class TcpTransport(SearpcTransport):
    """
    This transport uses TCP socket for communication.
    
    It follows the same protocol as named pipe transport:
    - request: <32b length header><json request>
    - response: <32b length header><json response>
    """

    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.socket = None

    def connect(self):
        """建立TCP连接"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            # 设置socket选项以提高性能
            self.socket.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            self.socket.connect((self.host, self.port))
            logger.debug('Connected to %s:%s', self.host, self.port)
        except Exception as e:
            if self.socket:
                self.socket.close()
                self.socket = None
            raise TcpTransportException(f'Failed to connect to {self.host}:{self.port}: {e}')

    def stop(self):
        """关闭TCP连接"""
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
            self.socket = None

    def send(self, service, fcall_str):
        """发送RPC请求并接收响应"""
        if not self.socket:
            raise TcpTransportException('Transport not connected')

        # 构造请求体
        body = json.dumps({
            'service': service,
            'request': fcall_str,
        })
        body_utf8 = body.encode(encoding='utf-8')
        
        try:
            # 发送请求头（32位无符号整数，小端序）
            header = struct.pack('=I', len(body_utf8))
            sendall(self.socket, header)
            sendall(self.socket, body_utf8)

            # 接收响应头
            resp_header = recvall(self.socket, 4)
            resp_size, = struct.unpack('=I', resp_header)
            
            # 接收响应体
            resp = recvall(self.socket, resp_size)
            return resp.decode(encoding='utf-8')
            
        except Exception as e:
            # 连接出错时关闭socket
            self.stop()
            raise TcpTransportException(f'Failed to send/receive data: {e}')


class TcpClient(SearpcClient):
    """
    Searpc client using TCP transport with connection pooling.
    """
    
    def __init__(self, host, port, service_name, pool_size=5):
        self.host = host
        self.port = port
        self.service_name = service_name
        self.pool_size = pool_size
        self._pool = queue.Queue(pool_size)

    def _create_transport(self):
        """创建新的TCP传输连接"""
        transport = TcpTransport(self.host, self.port)
        transport.connect()
        return transport

    def _get_transport(self):
        """从连接池获取传输连接"""
        try:
            transport = self._pool.get(False)
            # 简单检查连接是否还有效
            if not transport.socket:
                transport = self._create_transport()
        except queue.Empty:
            transport = self._create_transport()
        return transport

    def _return_transport(self, transport):
        """将传输连接返回到连接池"""
        try:
            self._pool.put(transport, False)
        except queue.Full:
            transport.stop()

    def call_remote_func_sync(self, fcall_str):
        """同步调用远程函数"""
        transport = self._get_transport()
        try:
            ret_str = transport.send(self.service_name, fcall_str)
            self._return_transport(transport)
            return ret_str
        except Exception as e:
            # 出错时不返回连接到池中
            transport.stop()
            raise e


def is_windows():
    """检查是否为Windows平台"""
    return platform.system().lower() == 'windows'


def create_client(service_name, socket_path=None, host=None, port=None, pool_size=5):
    """
    创建客户端的工厂函数
    
    Args:
        service_name: 服务名称
        socket_path: Unix socket路径（用于NamedPipeClient）
        host: TCP主机地址（用于TcpClient）
        port: TCP端口（用于TcpClient）
        pool_size: 连接池大小
        
    Returns:
        SearpcClient实例
    """
    # 如果明确指定了TCP参数，使用TCP
    if host is not None and port is not None:
        return TcpClient(host, port, service_name, pool_size)
    
    # 如果明确指定了socket路径，使用Named Pipe
    if socket_path is not None:
        from .named_pipe import NamedPipeClient
        return NamedPipeClient(socket_path, service_name, pool_size)
    
    # 如果都没指定，根据平台选择默认方式
    if is_windows():
        # Windows平台默认使用TCP（需要提供默认的host和port）
        logger.info('Windows platform detected, using TCP transport by default')
        # 这里使用默认值，实际使用时应该从配置中获取
        default_host = '127.0.0.1'
        default_port = 12001
        return TcpClient(default_host, default_port, service_name, pool_size)
    else:
        # 非Windows平台默认使用Named Pipe
        logger.info('Non-Windows platform detected, using named pipe transport by default')
        raise ValueError('socket_path must be provided for named pipe transport') 
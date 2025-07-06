from pysearpc import searpc_func, SearpcError, NamedPipeClient, TcpClient, create_client
import platform

# 首先导入原始的SeafServerThreadedRpcClient
from .rpcclient import SeafServerThreadedRpcClient

def copy_rpc_methods(source_class):
    """
    类装饰器：自动复制源类中的所有RPC方法到目标类
    """
    def decorator(target_class):
        # 复制所有RPC方法
        for attr_name in dir(source_class):
            if not attr_name.startswith('_'):
                attr = getattr(source_class, attr_name)
                if callable(attr) and hasattr(attr, 'ret_type') and hasattr(attr, 'arg_types'):
                    # 这是一个RPC方法，复制到目标类
                    setattr(target_class, attr_name, attr)
        return target_class
    return decorator


@copy_rpc_methods(SeafServerThreadedRpcClient)
class SeafServerThreadedTcpRpcClient(TcpClient):
    """
    基于TCP传输的Seafile RPC客户端
    通过类装饰器自动复制SeafServerThreadedRpcClient的所有RPC方法
    """
    
    def __init__(self, host, port, pool_size=5):
        TcpClient.__init__(self, host, port, "seafserv-threaded-rpcserver", pool_size)


def create_seafile_rpc_client(socket_path=None, host=None, port=None, pool_size=5):
    """
    创建Seafile RPC客户端的工厂函数
    
    Args:
        socket_path: Unix socket路径（用于NamedPipe方式）
        host: TCP主机地址（用于TCP方式）
        port: TCP端口（用于TCP方式）
        pool_size: 连接池大小
        
    Returns:
        SeafServerThreadedRpcClient实例（NamedPipe或TCP版本）
    """
    # 如果明确指定了TCP参数，使用TCP版本
    if host is not None and port is not None:
        return SeafServerThreadedTcpRpcClient(host, port, pool_size)
    
    # 如果明确指定了socket路径，使用NamedPipe版本
    if socket_path is not None:
        return SeafServerThreadedRpcClient(socket_path)
    
    # 如果都没指定，根据平台选择默认方式
    if platform.system().lower() == 'windows':
        # Windows平台默认使用TCP（需要提供默认的host和port）
        import logging
        logger = logging.getLogger(__name__)
        logger.info('Windows平台检测到，默认使用TCP传输方式')
        # 这里使用默认值，实际使用时应该从配置中获取
        default_host = '127.0.0.1'
        default_port = 12001
        return SeafServerThreadedTcpRpcClient(default_host, default_port, pool_size)
    else:
        # 非Windows平台需要提供socket路径
        raise ValueError('socket_path必须为非Windows平台的named pipe传输提供')


# 现在我们可以直接使用SeafServerThreadedTcpRpcClient，它已经包含了所有原始的RPC方法 
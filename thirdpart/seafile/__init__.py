from .rpcclient import SeafServerThreadedRpcClient as ServerThreadedRpcClient
from .rpcclient import SeafServerThreadedTcpRpcClient as ServerThreadedTcpRpcClient
from .rpcclient import create_seafile_rpc_client

class TaskType(object):
    DOWNLOAD = 0
    UPLOAD = 1

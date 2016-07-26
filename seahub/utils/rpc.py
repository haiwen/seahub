# Copyright (c) 2012-2016 Seafile Ltd.
"""
Proxy RPC calls to seafile_api, silence RPC errors, emulating Ruby's
"method_missing".
"""

from functools import partial
import logging

from seaserv import seafile_api
from pysearpc import SearpcError

# Get an instance of a logger
logger = logging.getLogger(__name__)

class RPCProxy(object):
    def __init__(self, mute=False):
        self.mute = mute

    def __getattr__(self, name):
        return partial(self.method_missing, name)

    def method_missing(self, name, *args, **kwargs):
        real_func = getattr(seafile_api, name)
        if self.mute:
            try:
                return real_func(*args, **kwargs)
            except SearpcError as e:
                logger.warn(e, exc_info=True)
                return None
        else:
            return real_func(*args, **kwargs)


mute_seafile_api = RPCProxy(mute=True)

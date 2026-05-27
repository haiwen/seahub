from seahub_io.app.event_redis import redis_cache
from seahub_io.app.memcache import mem_cache
from seahub_io.app.config import CACHE_PROVIDER

MEMCACHED_PROVIDER = 'memcached'
REDIS_CACHE_PROVIDER = 'redis'
 

class CacheProvider(object):

    def __init__(self):
        self.cache_client = None
        self._init_cache_provider()
        self.cache_name = self.cache_client and self.cache_client.CACHE_NAME or None

    def _init_cache_provider(self):
        cache_provider = CACHE_PROVIDER
        if cache_provider not in [MEMCACHED_PROVIDER, REDIS_CACHE_PROVIDER]:
            return
        
        if cache_provider == MEMCACHED_PROVIDER:
            self.cache_client = mem_cache
        else:
            self.cache_client = redis_cache

    def set(self, key, value, timeout=0):
        
        if not self.cache_client:
            return 
        return self.cache_client.set(key, value, timeout)

    def get(self, key):
        
        if not self.cache_client:
            return
        return self.cache_client.get(key)
    
    def delete(self, key):
        
        if not self.cache_client:
            return
        return self.cache_client.delete(key)
    
cache = CacheProvider()

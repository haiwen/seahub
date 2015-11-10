from django.apps import AppConfig
from django.core.cache import cache

class BaseConfig(AppConfig):
    name = "seahub.base"
    verbose_name = "seahub base app"

    def ready(self):
        super(BaseConfig, self).ready()
        cache.set('test_cache', 'worked')
        if cache.get('test_cache') != 'worked':
            print '''
Warning: Cache is not working, please check memcached is running if you are using
memcached backend, otherwise, please check permission of cache directory on your
file system.
            '''

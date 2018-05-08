# Copyright (c) 2012-2016 Seafile Ltd.
from django.apps import AppConfig
from django.core.cache import cache

class BaseConfig(AppConfig):
    name = "seahub.base"
    verbose_name = "seahub base app"

    def ready(self):
        super(BaseConfig, self).ready()

        # check memcache is available
        cache.set('test_cache', 'worked')
        if cache.get('test_cache') != 'worked':
            print '''
Warning: Cache is not working, please check memcached is running if you are using
memcached backend, otherwise, please check permission of cache directory on your
file system.
            '''

        # check table `base_filecomment` is ok
        from seahub.base.models import FileComment
        try:
            _ = list(FileComment.objects.all()[:1].values('uuid_id'))
        except:
            print '''
Warning: File comment has changed since version 6.3, while table `base_filecomment` is not migrated yet, please consider migrate it according to v6.3.0 release note, otherwise the file comment feature will not work correctly.
            '''

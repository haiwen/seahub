# Copyright (c) 2012-2016 Seafile Ltd.
from django.test import TestCase
from mock import Mock
from . import middleware
from .middleware import RedirectMiddleware, get_subdomain, construct_org_url


class RedirectMiddlewareTest(TestCase):
    def setUp(self):
        self.rm = RedirectMiddleware()
        self.request = Mock()
        self.request.META = {'HTTP_HOST': 'seacloud.cc'}
        self.request.is_secure = Mock(return_value=True)
        self.request.get_full_path = Mock(return_value="/home/my/")
        
        self.request.user = Mock()
        self.request.user.org = Mock()
        self.request.user.org.url_prefix = 'foo'

    def test_get_subdomain(self):
        d = {'https://seacloud.cc': 'foo.seacloud.cc',
             'https://seacloud.cc:8000': 'foo.seacloud.cc:8000',
             'https://seacloud.cc:8000/': 'foo.seacloud.cc:8000',
             'https://seacloud.com.cn:8000/': 'foo.seacloud.com.cn:8000',
             'https://seafile.mysite.edu.net:8000/': 'foo.seafile.mysite.edu.net:8000',}
        for service_url, domain in list(d.items()):
            middleware.get_service_url = lambda: service_url
            self.assertEqual(get_subdomain(domain), 'foo')

        d = {'https://seacloud.cc': 'seacloud.cc',
             'https://seacloud.cc:8000': 'seacloud.cc:8000',
             'https://seacloud.cc:8000/': 'seacloud.cc:8000',
             'https://seacloud.com.cn:8000/': 'seacloud.com.cn:8000',
             'https://seafile.mysite.edu.net:8000/': 'seafile.mysite.edu.net:8000',}
        for service_url, domain in list(d.items()):
            middleware.get_service_url = lambda: service_url
            self.assertEqual(get_subdomain(domain), None)

    def test_construct_org_url(self):
        url_prefix = 'foo'
        path = '/home/my/'
        service_url = 'https://seafile.mysite.edu.net:8000/'
        middleware.get_service_url = lambda: service_url        
        
        self.assertEqual(construct_org_url(url_prefix, path),
                         'https://foo.seafile.mysite.edu.net:8000/home/my/')
        

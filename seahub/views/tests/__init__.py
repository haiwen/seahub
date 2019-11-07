# Copyright (c) 2012-2016 Seafile Ltd.
"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""
import factory
from mock import Mock, patch

from django.http import HttpRequest
from django.test import TestCase

from seahub.base.accounts import User

def setup():
    global repo_id, mock_content, mock_repo, mock_dirent, request
    repo_id = '181150f2-3df0-4ab3-9ecd-1e1ec8e14def'
    mock_content = 'fake content'
    mock_repo = Mock()
    mock_repo.id = repo_id
    mock_dirent = Mock()
    mock_dirent.obj_name = 'home.md'

    request = FakeRequestFactory()

    def render_to_response_echo(*args, **kwargs):
        """mocked render_to_response that just returns what was passed in,
        also puts the template name into the results dict
        """
        context = args[1]
        context.update(dict(template_name=args[0]))
        return context
    patch('seahub.views.wiki.render_to_response',
          render_to_response_echo).start()

########## Helpler functions and classes
def FakeRequestFactory(*args, **kwargs):
    ''' FakeRequestFactory, FakeMessages and FakeRequestContext are good for
    mocking out django views; they are MUCH faster than the Django test client.
    '''

    user = UserFactory()
    if kwargs.get('authenticated'):
        user.is_authenticated = lambda: True

    request = HttpRequest()
    request.user = user
    request.cloud_mode = False
    request._messages = FakeMessages()
    request.session = kwargs.get('session', {})
    if kwargs.get('POST'):
        request.method = 'POST'
        request.POST = kwargs.get('POST')
    else:
        request.method = 'GET'
        request.POST = kwargs.get('GET', {})

    return request

class UserFactory(factory.Factory):
    ''' using the excellent factory_boy library '''
    class Meta:
        model = User

    @classmethod
    def _setup_next_sequence(cls):
        # Instead of defaulting to starting with 0, start with 1.
        return 1

    email = factory.Sequence(lambda n: 'user%d@example.ecom' % n)

class FakeMessages:
    ''' mocks the Django message framework, makes it easier to get
    the messages out '''

    messages = []

    def add(self, level, message, extra_tags):
        self.messages.append(str(message))

    @property
    def pop(self):
        return self.messages.pop()

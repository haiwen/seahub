# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import urllib.request, urllib.parse, urllib.error
import hashlib
from urllib.parse import urlparse

from django import template
from django.core.urlresolvers import reverse
from django.utils.html import format_html

from seahub.base.accounts import User

from seahub.avatar.settings import (AVATAR_GRAVATAR_BACKUP, AVATAR_GRAVATAR_DEFAULT,
                             AVATAR_DEFAULT_SIZE)
from seahub.avatar.util import get_primary_avatar, get_default_avatar_url, \
    cache_result, get_default_avatar_non_registered_url
from seahub.utils import get_service_url
from seahub.settings import SITE_ROOT, AVATAR_FILE_STORAGE

# Get an instance of a logger
logger = logging.getLogger(__name__)

register = template.Library()

@cache_result
@register.simple_tag
def avatar_url(user, size=AVATAR_DEFAULT_SIZE):
    avatar = get_primary_avatar(user, size=size)
    if avatar:
        url = avatar.avatar_url(size)
    else:
        if AVATAR_GRAVATAR_BACKUP:
            params = {'s': str(size)}
            if AVATAR_GRAVATAR_DEFAULT:
                params['d'] = AVATAR_GRAVATAR_DEFAULT
            return "http://www.gravatar.com/avatar/%s/?%s" % (
                hashlib.md5(user.email.encode('utf-8')).hexdigest(),
                urllib.parse.urlencode(params))
        else:
            url = get_default_avatar_url()

    # when store avatars in the media directory
    if not AVATAR_FILE_STORAGE:
        return url

    if SITE_ROOT != '/':
        return '/%s/%s' % (SITE_ROOT.strip('/'), url.strip('/'))
    else:
        return url

@cache_result
def api_avatar_url(user, size=AVATAR_DEFAULT_SIZE):
    service_url = get_service_url()
    service_url = service_url.rstrip('/')

    # when store avatars in the media directory
    if not AVATAR_FILE_STORAGE:
        # urlparse('https://192.157.12.3:89/demo')
        # ParseResult(scheme='https', netloc='192.157.12.3:89', path='/demo', params='', query='', fragment='')
        parse_result = urlparse(service_url)
        service_url = '%s://%s' % (parse_result[0], parse_result[1])

    avatar = get_primary_avatar(user, size=size)
    if avatar:
        url = avatar.avatar_url(size)
        date_uploaded = avatar.date_uploaded
        # /media/avatars/6/9/5011f01afac2a506b9544c5ce21a0a/resized/32/109af9901c0fd38ab39d018f5cd4baf6.png
        return service_url + url, False, date_uploaded
    else:
        # /media/avatars/default.png
        return service_url + get_default_avatar_url(), True, None

@cache_result
@register.simple_tag
def avatar(user, size=AVATAR_DEFAULT_SIZE):
    if not isinstance(user, User):
        try:
            user = User.objects.get(email=user)
            url = avatar_url(user, size*2)
        except User.DoesNotExist:
            url = get_default_avatar_non_registered_url()
        except Exception as e:
            # Catch exceptions to avoid 500 errors.
            logger.error(e)
            url = get_default_avatar_non_registered_url()
    else:
        try:
            url = avatar_url(user, size*2)
        except Exception as e:
            # Catch exceptions to avoid 500 errors.
            logger.error(e)
            url = get_default_avatar_non_registered_url()

    return format_html("""<img src="%s" width="%s" height="%s" class="avatar" />""" % (url, size, size))

@cache_result
@register.simple_tag
def primary_avatar(user, size=AVATAR_DEFAULT_SIZE):
    """
    This tag tries to get the default avatar for a user without doing any db
    requests. It achieve this by linking to a special view that will do all the 
    work for us. If that special view is then cached by a CDN for instance,
    we will avoid many db calls.
    """
    url = reverse('avatar_render_primary', kwargs={'user' : user, 'size' : size})
    return """<img src="%s" width="%s" height="%s" />""" % (url, size, size)

@cache_result
@register.simple_tag
def render_avatar(avatar, size=AVATAR_DEFAULT_SIZE):
    if not avatar.thumbnail_exists(size):
        avatar.create_thumbnail(size)
    return """<img src="%s" width="%s" height="%s" />""" % (
        avatar.avatar_url(size), size, size)

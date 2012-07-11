import urllib

from django.conf import settings

from django import template
from django.utils.hashcompat import md5_constructor
from django.core.urlresolvers import reverse

from group.settings import (AVATAR_DEFAULT_SIZE, AVATAR_DEFAULT_URL)
from group.models import Avatar

register = template.Library()

def get_default_avatar_url():
    base_url = getattr(settings, 'STATIC_URL', None)
    if not base_url:
        base_url = getattr(settings, 'MEDIA_URL', '') 
    # Don't use base_url if the default avatar url starts with http:// of https://
    if AVATAR_DEFAULT_URL.startswith('http://') or AVATAR_DEFAULT_URL.startswith('https://'):
        return AVATAR_DEFAULT_URL
    # We'll be nice and make sure there are no duplicated forward slashes
    ends = base_url.endswith('/')
    begins = AVATAR_DEFAULT_URL.startswith('/')
    if ends and begins:
        base_url = base_url[:-1]
    elif not ends and not begins:
        return '%s/%s' % (base_url, AVATAR_DEFAULT_URL)
    return '%s%s' % (base_url, AVATAR_DEFAULT_URL)

@register.simple_tag
def grp_avatar_url(group_id, size=AVATAR_DEFAULT_SIZE):
    grp_avatars = Avatar.objects.filter(group_id=group_id)
    if grp_avatars:
        avatar = grp_avatars.order_by('-date_uploaded')[0]
    else:
        avatar = None

    if avatar:
        if not avatar.thumbnail_exists(size):
            avatar.create_thumbnail(size)
        avatar_src = avatar.avatar_url(size)
    else:
        avatar_src = get_default_avatar_url()

    return avatar_src

import urllib
import hashlib

from django import template
from django.utils.translation import ugettext as _
from django.core.urlresolvers import reverse

from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.views import is_registered_user

from seahub.avatar.settings import (AVATAR_GRAVATAR_BACKUP, AVATAR_GRAVATAR_DEFAULT,
                             AVATAR_DEFAULT_SIZE)
from seahub.avatar.util import get_primary_avatar, get_default_avatar_url, \
    cache_result, get_default_avatar_non_registered_url

register = template.Library()


@cache_result
@register.simple_tag
def avatar_url(user, size=AVATAR_DEFAULT_SIZE):
    avatar = get_primary_avatar(user, size=size)
    if avatar:
        return avatar.avatar_url(size)
    else:
        if AVATAR_GRAVATAR_BACKUP:
            params = {'s': str(size)}
            if AVATAR_GRAVATAR_DEFAULT:
                params['d'] = AVATAR_GRAVATAR_DEFAULT
            return "http://www.gravatar.com/avatar/%s/?%s" % (
                hashlib.md5(user.email).hexdigest(),
                urllib.urlencode(params))
        else:
            return get_default_avatar_url()

@cache_result
@register.simple_tag
def avatar(user, size=AVATAR_DEFAULT_SIZE):
    if not isinstance(user, User):
        try:
            user = User.objects.get(email=user)
            alt = email2nickname(user.username)
            url = avatar_url(user, size)
        except User.DoesNotExist:
            url = get_default_avatar_non_registered_url()
            alt = _("Default Avatar")
    else:
        alt = email2nickname(user.username)
        url = avatar_url(user, size)

    return """<img src="%s" alt="%s" width="%s" height="%s" class="avatar" />""" % (url, alt,
        size, size)

@cache_result
@register.simple_tag
def primary_avatar(user, size=AVATAR_DEFAULT_SIZE):
    """
    This tag tries to get the default avatar for a user without doing any db
    requests. It achieve this by linking to a special view that will do all the 
    work for us. If that special view is then cached by a CDN for instance,
    we will avoid many db calls.
    """
    alt = unicode(user)
    url = reverse('avatar_render_primary', kwargs={'user' : user, 'size' : size})
    return """<img src="%s" alt="%s" width="%s" height="%s" />""" % (url, alt,
        size, size)

@cache_result
@register.simple_tag
def render_avatar(avatar, size=AVATAR_DEFAULT_SIZE):
    if not avatar.thumbnail_exists(size):
        avatar.create_thumbnail(size)
    return """<img src="%s" alt="%s" width="%s" height="%s" />""" % (
        avatar.avatar_url(size), str(avatar), size, size)

from seahub.profile.models import Profile
from seahub.utils.auth import gen_user_virtual_id

USER_FIELDS = ['username', 'email']


def get_username(strategy, details, backend, user=None, *args, **kwargs):
    if 'username' not in backend.setting('USER_FIELDS', USER_FIELDS):
        return
    storage = strategy.storage

    if not user:
        final_username = gen_user_virtual_id()
    else:
        final_username = storage.user.get_username(user)

    return {'username': final_username}


def create_user(strategy, details, backend, user=None, *args, **kwargs):
    if user:
        return {'is_new': False}

    fields = dict((name, kwargs.get(name, details.get(name)))
                  for name in backend.setting('USER_FIELDS', USER_FIELDS))
    if not fields:
        return

    return {
        'is_new': True,
        'user': strategy.create_user(**fields)
    }



def save_profile(strategy, details, backend, user=None, *args, **kwargs):
    if not user:
        return
    email = details.get('email', '')
    if email:
        Profile.objects.add_or_update(username=user.username,
                                      contact_email=email)

    fullname = details.get('fullname', '')
    if fullname:
        Profile.objects.add_or_update(username=user.username,
                                      nickname=fullname)

    # weixin username and profile_image_url
    nickname = details.get('username', '')
    if nickname:
        Profile.objects.add_or_update(username=user.username,
                                      nickname=nickname)

    avatar_url = details.get('profile_image_url', '')
    if avatar_url:
        _update_user_avatar(user, avatar_url)

import os
import logging
import urllib2
from django.core.files import File
from seahub.avatar.models import Avatar
from seahub.avatar.signals import avatar_updated
logger = logging.getLogger(__name__)

def _update_user_avatar(user, pic):
    if not pic:
        return

    logger.info("retrieve pic from %s" % pic)

    filedata = urllib2.urlopen(pic)
    datatowrite = filedata.read()
    filename = '/tmp/%s.jpg' % user.username
    with open(filename, 'wb') as f:
        f.write(datatowrite)

    logger.info("save pic to %s" % filename)
    avatar = Avatar(emailuser=user.username, primary=True)
    avatar.avatar.save(
        'image.jpg', File(open(filename))
    )
    avatar.save()
    avatar_updated.send(sender=Avatar, user=user, avatar=avatar)

    os.remove(filename)

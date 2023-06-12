# Copyright (c) 2012-2016 Seafile Ltd.
from abc import abstractmethod
import datetime
import hashlib
import os
import logging

from seahub.base.fields import LowerCaseCharField

from django.db import models
from django.core.files.base import ContentFile
from django.utils.translation import gettext as _
from django.utils.encoding import smart_str
from django.db.models import signals

try:
    from io import BytesIO
    dir(BytesIO) # Placate PyFlakes
except ImportError:
    from io import BytesIO

try:
    from PIL import Image
    dir(Image) # Placate PyFlakes
except ImportError:
    import Image

from seahub.avatar.util import invalidate_cache, get_avatar_file_storage
from seahub.avatar.settings import (AVATAR_STORAGE_DIR, AVATAR_RESIZE_METHOD,
                             AVATAR_MAX_AVATARS_PER_USER, AVATAR_THUMB_FORMAT,
                             AVATAR_HASH_USERDIRNAMES, AVATAR_HASH_FILENAMES,
                             AVATAR_THUMB_QUALITY, AUTO_GENERATE_AVATAR_SIZES,
                             GROUP_AVATAR_STORAGE_DIR)

# Get an instance of a logger
logger = logging.getLogger(__name__)

def avatar_file_path(instance=None, filename=None, size=None, ext=None):
    if isinstance(instance, Avatar):
        tmppath = [AVATAR_STORAGE_DIR]
        if AVATAR_HASH_USERDIRNAMES:
            tmp = hashlib.md5(instance.emailuser.encode('utf-8')).hexdigest()
            tmppath.extend([tmp[0], tmp[1], tmp[2:]])
        else:
            tmppath.append(instance.emailuser)
    elif isinstance(instance, GroupAvatar):
        tmppath = [GROUP_AVATAR_STORAGE_DIR]
        tmppath.append(instance.group_id)
    else:
        return ""
    
    if not filename:
        # Filename already stored in database
        filename = instance.avatar.name
        if ext and AVATAR_HASH_FILENAMES:
            # An extension was provided, probably because the thumbnail
            # is in a different format than the file. Use it. Because it's
            # only enabled if AVATAR_HASH_FILENAMES is true, we can trust
            # it won't conflict with another filename
            (root, oldext) = os.path.splitext(filename)
            filename = root + "." + ext
    else:
        # File doesn't exist yet
        if AVATAR_HASH_FILENAMES:
            (root, ext) = os.path.splitext(filename)
            filename = hashlib.md5(smart_str(filename).encode('utf-8')).hexdigest()
            filename = filename + ext
    if size:
        tmppath.extend(['resized', str(size)])
    tmppath.append(os.path.basename(filename))
    return os.path.join(*tmppath)

def find_extension(format):
    format = format.lower()

    if format == 'jpeg':
        format = 'jpg'

    return format

class AvatarBase(object):
    """
    Base class for avatar.
    """
    def thumbnail_exists(self, size):
        return self.avatar.storage.exists(self.avatar_name(size))

    def create_thumbnail(self, size, quality=None):
        # invalidate the cache of the thumbnail with the given size first
        if isinstance(self, Avatar):
            invalidate_cache(self.emailuser, size)

        try:
            orig = self.avatar.storage.open(self.avatar.name, 'rb').read()
            image = Image.open(BytesIO(orig))

            quality = quality or AVATAR_THUMB_QUALITY
            (w, h) = image.size
            if w != size or h != size:
                if w > h:
                    diff = (w - h) / 2
                    image = image.crop((diff, 0, w - diff, h))
                else:
                    diff = (h - w) / 2
                    image = image.crop((0, diff, w, h - diff))
                if image.mode != "RGBA":
                    image = image.convert("RGBA")
                image = image.resize((size, size), AVATAR_RESIZE_METHOD)
                thumb = BytesIO()
                image.save(thumb, AVATAR_THUMB_FORMAT, quality=quality)
                thumb_file = ContentFile(thumb.getvalue())
            else:
                thumb_file = ContentFile(orig)
            thumb = self.avatar.storage.save(self.avatar_name(size), thumb_file)
        except Exception as e:
            logger.error(e)
            return # What should we do here?  Render a "sorry, didn't work" img?

    def avatar_url(self, size):
        return self.avatar.storage.url(self.avatar_name(size))

    @abstractmethod
    def save(self, *args, **kwargs):
        pass
    
    def avatar_name(self, size):
        ext = find_extension(AVATAR_THUMB_FORMAT)
        return avatar_file_path(
            instance=self,
            size=size,
            ext=ext
        )

class Avatar(models.Model, AvatarBase):
    emailuser = LowerCaseCharField(max_length=255)
    primary = models.BooleanField(default=False)
    avatar = models.ImageField(max_length=1024,
                               upload_to=avatar_file_path,
                               storage=get_avatar_file_storage(),
                               blank=True)
    date_uploaded = models.DateTimeField(default=datetime.datetime.now)
    
    def __unicode__(self):
        return _('Avatar for %s') % self.emailuser
    
    def save(self, *args, **kwargs):
        avatars = Avatar.objects.filter(emailuser=self.emailuser)
        if self.pk:
            avatars = avatars.exclude(pk=self.pk)
        if AVATAR_MAX_AVATARS_PER_USER > 1:
            if self.primary:
                avatars = avatars.filter(primary=True)
                avatars.update(primary=False)
        else:
            avatars.delete()
        invalidate_cache(self.emailuser)
        super(Avatar, self).save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        invalidate_cache(self.emailuser)
        super(Avatar, self).delete(*args, **kwargs)

class GroupAvatar(models.Model, AvatarBase):
    group_id = models.CharField(max_length=255)
    avatar = models.ImageField(max_length=1024,
                               upload_to=avatar_file_path,
                               storage=get_avatar_file_storage(),
                               blank=True)
    date_uploaded = models.DateTimeField(default=datetime.datetime.now)
    
    def __unicode__(self):
        return _('Avatar for %s') % self.group_id

    def save(self, *args, **kwargs):
        super(GroupAvatar, self).save(*args, **kwargs)

def create_default_thumbnails(instance=None, created=False, **kwargs):
    if created:
        for size in AUTO_GENERATE_AVATAR_SIZES:
            instance.create_thumbnail(size)

signals.post_save.connect(create_default_thumbnails, sender=Avatar, dispatch_uid="create_default_thumbnails")


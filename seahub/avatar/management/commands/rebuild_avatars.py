# Copyright (c) 2012-2016 Seafile Ltd.
from django.core.management.base import BaseCommand

from seahub.avatar.models import Avatar
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE

class Command(BaseCommand):
    help = "Regenerates avatar thumbnails for the sizes specified in " + \
        "settings.AVATAR_DEFAULT_SIZE."
    
    def handle(self, **options):
        for avatar in Avatar.objects.all():
            print("Rebuilding Avatar id=%s at size %s." % (avatar.id, AVATAR_DEFAULT_SIZE))
            avatar.create_thumbnail(AVATAR_DEFAULT_SIZE)

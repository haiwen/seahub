# Copyright (c) 2012-2016 Seafile Ltd.
from django.core.management.base import BaseCommand

from seahub.avatar.models import Avatar
from seahub.avatar.settings import AUTO_GENERATE_AVATAR_SIZES

class Command(BaseCommand):
    help = "Regenerates avatar thumbnails for the sizes specified in " + \
        "settings.AUTO_GENERATE_AVATAR_SIZES."
    
    def handle(self, **options):
        for avatar in Avatar.objects.all():
            for size in AUTO_GENERATE_AVATAR_SIZES:
                print("Rebuilding Avatar id=%s at size %s." % (avatar.id, size))
                avatar.create_thumbnail(size)

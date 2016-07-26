# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import shutil

from django.core.management.base import BaseCommand

from seahub.settings import THUMBNAIL_ROOT

class Command(BaseCommand):
    help = "Clean image files's thumbnail"

    def handle(self, *args, **options):
        shutil.rmtree(THUMBNAIL_ROOT, ignore_errors=True)
        self.stdout.write('Successfully clean thumbnail')

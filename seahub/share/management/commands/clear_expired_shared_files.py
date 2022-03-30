# -*- coding: utf-8 -*-
import os
import logging
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from django.db.models import Q

from seaserv import seafile_api

from seahub.base.accounts import User
from seahub.share.models import FileShare

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clear expired shared files.'
    label = 'clear_expired_shared_files'

    EMAIL_ATTACHMENT_ACCOUNT = getattr(settings, 'EMAIL_ATTACHMENT_ACCOUNT', None)
    EXPIRED_FILES_CLEAR_DAYS = getattr(settings, 'EXPIRED_FILES_CLEAR_DAYS', 7)

    def handle(self, *args, **options):
        logger.debug('Start clear expired shared files.')
        print('[%s] Start clear expired shared files.' % datetime.now())
        self.clear_files()
        logger.debug('Finish clear expired shared files.\n')
        print('[%s] Finish clear expired shared files.\n' % datetime.now())

    def clear_files(self):
        username = self.EMAIL_ATTACHMENT_ACCOUNT
        clear_days = self.EXPIRED_FILES_CLEAR_DAYS

        if username is None:
            logger.error('EMAIL_ATTACHMENT_ACCOUNT not set.')
            print('[%s] EMAIL_ATTACHMENT_ACCOUNT not set.' % datetime.now())
            return

        try:
            User.objects.get(email=username)
        except User.DoesNotExist:
            logger.error('User %s not found.' % username)
            print('[%s] User %s not found.' % (datetime.now(), username))
            return

        # get expired shared files
        delta = timedelta(days=clear_days)
        expired_date = timezone.now() - delta
        expired_file_shares = FileShare.objects.filter(Q(username=username) & Q(expire_date__lt=expired_date))

        # clear expired shared files
        for expired_file_share in expired_file_shares:
            repo_id = expired_file_share.repo_id
            file_path = expired_file_share.path
            parent_dir = os.path.dirname(file_path)
            filename = os.path.basename(file_path)
            try:
                seafile_api.del_file(repo_id, parent_dir, filename, username)
            except Exception as e:
                logger.error('Failed clear expired shared file %s, error: %s' % (file_path, e))
                print('[%s] Failed clear expired shared file %s, error: %s' % (datetime.now(), file_path, e))
                continue

        logger.debug('Successful clear expired shared files.')
        print('[%s] Successful clear expired shared files.' % datetime.now())

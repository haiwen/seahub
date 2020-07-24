# encoding: utf-8

import logging
from datetime import datetime
import stat
import os
import time

from django.core.management.base import BaseCommand

from seaserv import seafile_api, ccnet_api

from seahub.repo_files_auto_del.models import RepoFilesAutoDel

logger = logging.getLogger(__name__)


def iterate_and_del_files_recursively(repo_id, path, days):
    dirents = seafile_api.list_dir_by_path(repo_id, path)

    for dirent in dirents:

        if stat.S_ISDIR(dirent.mode):
            iterate_and_del_files_recursively(repo_id, os.path.join(path, dirent.obj_name), days)
            continue

        mtime = dirent.mtime
        cur_time = int(time.time())
        time_delta = days * 24 * 60 * 60
        if cur_time - time_delta > mtime:
            file_full_path = os.path.join(path, dirent.obj_name)
            seafile_api.del_file(repo_id, path, dirent.obj_name, 'seafevents')
            logger.info('{} of {} deleted at {}.'.format(file_full_path, repo_id, cur_time))


class Command(BaseCommand):
    help = 'scan repo_files_auto_del table, and delete old files if checked true'
    label = "scan_repo_files_auto_del"


    def handle(self, *args, **options):
        logger.debug('Start scan repo_files_auto_del...')
        self.stdout.write('[%s] Start scan repo_files_auto_del...\n' % datetime.now())

        try:
            self.do_action(*args, **options)
        except Exception as e:
            logger.error(e)

        self.stdout.write('[%s] Finish scan repo_files_auto_del.\n' % datetime.now())
        logger.debug('Finish scan repo_files_auto_del.')


    def do_action(self, *args, **options):
        repo_files_auto_dels = RepoFilesAutoDel.objects.filter(days__gt=0)
        for auto_del in repo_files_auto_dels:
            iterate_and_del_files_recursively(auto_del.repo_id, '/', auto_del.days)

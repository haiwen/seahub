# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import logging
import datetime
import posixpath

from django.core.management.base import BaseCommand
from django.utils.translation import gettext as _

from seahub.utils import get_all_users_traffic_by_month
from seahub.utils.ms_excel import write_xls
from seahub.utils.file_size import byte_to_mb

# Get an instance of a logger
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Export user traffic to '../User-Traffic.xlsx'."

    def add_arguments(self, parser):

        # Named (optional) arguments
        parser.add_argument(
            '--date',
            help='Should be format of yyyymm, for example: 201907.',
        )

        parser.add_argument(
            '--path',
            help='Folder path to save the file. If not passed, Seafile will save the file in current folder.',
        )

    def handle(self, *args, **options):
        path = options['path']
        month = str(options['date'])
        if not month:
            self.stdout.write("month invalid.")
            return

        month_obj = datetime.datetime.strptime(month, "%Y%m")
        res_data = get_all_users_traffic_by_month(month_obj, -1, -1)

        data_list = []
        head = [_("Time"), _("User"), _("Web Download") + ('(MB)'), \
                _("Sync Download") + ('(MB)'), _("Link Download") + ('(MB)'), \
                _("Web Upload") + ('(MB)'), _("Sync Upload") + ('(MB)'), \
                _("Link Upload") + ('(MB)')]

        for data in res_data:
            web_download = byte_to_mb(data['web_file_download'])
            sync_download = byte_to_mb(data['sync_file_download'])
            link_download = byte_to_mb(data['link_file_download'])
            web_upload = byte_to_mb(data['web_file_upload'])
            sync_upload = byte_to_mb(data['sync_file_upload'])
            link_upload = byte_to_mb(data['link_file_upload'])

            row = [month, data['user'], web_download, sync_download, \
                    link_download, web_upload, sync_upload, link_upload]

            data_list.append(row)

        excel_name = "User-Traffic-%s" % month
        wb = write_xls(excel_name, head, data_list)
        wb.save(posixpath.join(path, '%s.xlsx' % excel_name)) if path else wb.save('%s.xlsx' % excel_name)

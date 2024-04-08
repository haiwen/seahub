# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import logging
import posixpath

from django.core.management.base import BaseCommand
from django.utils.translation import gettext as _

from seaserv import seafile_api

from seahub.utils import is_pro_version, generate_file_audit_event_type
from seahub.utils.ms_excel import write_xls
from seahub.utils.timeutils import utc_to_local

from seahub.api2.endpoints.utils import check_time_period_valid, \
    get_log_events_by_type_and_time

# Get an instance of a logger
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Export user storage to '../file-access-logs.xlsx'."

    def add_arguments(self, parser):

        # Named (optional) arguments
        parser.add_argument(
            '--path',
            help='Folder path to save the file. If not passed, Seafile will save the file in current folder.',
        )

        parser.add_argument(
            '--start-date',
            help='For example, 2019-06-01.',
        )
        parser.add_argument(
            '--end-date',
            help='For example, 2019-07-01.',
        )

    def handle(self, *args, **options):
        """ Export file access logs to excel.
        """
        if not is_pro_version():
            self.stdout.write("Failed to export excel, this feature is only in professional version.")
            return

        path = options['path']
        start = str(options['start_date'])
        end = str(options['end_date'])
        if not check_time_period_valid(start, end):
            self.stdout.write("Failed to export excel, invalid start or end date.")
            return

        events = get_log_events_by_type_and_time('file_audit', start, end)

        head = [_("User"), _("Type"), _("IP"), _("Device"), _("Date"),
                _("Library Name"), _("Library ID"), _("Library Owner"), _("File Path"),]
        data_list = []

        repo_obj_dict = {}
        repo_owner_dict = {}

        events.sort(key=lambda x: x.timestamp, reverse=True)
        for ev in events:
            event_type, ev.show_device = generate_file_audit_event_type(ev)

            repo_id = ev.repo_id
            if repo_id not in repo_obj_dict:
                repo = seafile_api.get_repo(repo_id)
                repo_obj_dict[repo_id] = repo
            else:
                repo = repo_obj_dict[repo_id]

            if repo:
                repo_name = repo.name
                if repo_id not in repo_owner_dict:
                    repo_owner = seafile_api.get_repo_owner(repo_id) or \
                            seafile_api.get_org_repo_owner(repo_id)
                    repo_owner_dict[repo_id] = repo_owner
                else:
                    repo_owner = repo_owner_dict[repo_id]
            else:
                repo_name = _('Deleted')
                repo_owner = '--'

            username = ev.user if ev.user else _('Anonymous User')
            date = utc_to_local(ev.timestamp).strftime('%Y-%m-%d %H:%M:%S') if \
                ev.timestamp else ''

            row = [username, event_type, ev.ip, ev.show_device,
                   date, repo_name, ev.repo_id, repo_owner, ev.file_path]
            data_list.append(row)

        excel_name = 'file-access-logs.xlsx'
        wb = write_xls('file-access-logs', head, data_list)
        wb.save(posixpath.join(path, excel_name)) if path else wb.save(excel_name)

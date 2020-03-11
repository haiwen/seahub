# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8

import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.views import check_folder_permission
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email

logger = logging.getLogger(__name__)


class RepoCommitView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, commit_id, format=None):
        """ List commit info
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        commit = seafile_api.get_commit(repo.id, repo.version, commit_id)
        if not commit:
            error_msg = 'Commit %s not found.' % commit_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # commit __dict__
        #
        # {'_dict': {u'client_version': u'7.0.2',
        #    u'conflict': False,
        #    u'creator': u'30947ef13cd56439c72703ee74dcfa2a4d940cdb',
        #    u'creator_name': u'lian@lian.com',
        #    u'ctime': 1583893023,
        #    u'desc': u'Added or modified "1.md" and 2 more files.\nDeleted "default.jpeg".\nRenamed "123.umind" and 1 more files.\nAdded "789" and 1 more directories.\nRemoved directory "456".\n',
        #    u'device_name': u'lian mac pro work',
        #    u'id': u'28c15cca4a8dbd5135fbe3ae75c3df7f5f355484',
        #    u'new_merge': False,
        #    u'next_start_commit': None,
        #    u'parent_id': u'a12ece3a2ec69220bfa5f229682867faaf7448f7',
        #    u'repo_id': u'8756ca9d-e3ed-44da-b43e-1bfd165b2377',
        #    u'rev_file_id': None,
        #    u'rev_file_size': 0,
        #    u'rev_renamed_old_path': None,
        #    u'root_id': u'0b7f91ad5137cf1d1e5be138ecd455ce76d2ee58',
        #    u'second_parent_id': None,
        #    u'version': 1},

        # commit diff __dict__
        #
        # {'_dict': {u'status': None, u'new_name': u'xyz', u'name': u'abc'}, 'props': <pysearpc.client._SearpcObj object at 0x7ff4f81b2090>}
        # {'_dict': {u'status': u'mov', u'new_name': u'123.jpg', u'name': u'd0efd88ejw1f6vqsjmjh9j20c846i4i6.jpg'}, 'props': <pysearpc.client._SearpcObj object at 0x7fbc5478c090>}
        # {'_dict': {u'status': u'mod', u'new_name': None, u'name': u'123/1.md'}, 'props': <pysearpc.client._SearpcObj object at 0x7fbc5478c290>}
        # {'_dict': {u'status': u'deldir', u'new_name': None, u'name': u'123/456'}, 'props': <pysearpc.client._SearpcObj object at 0x7fbc5478c2d0>}
        # {'_dict': {u'status': u'newdir', u'new_name': None, u'name': u'123/789'}, 'props': <pysearpc.client._SearpcObj object at 0x7fbc5478c310>}
        # {'_dict': {u'status': u'del', u'new_name': None, u'name': u'default.jpeg'}, 'props': <pysearpc.client._SearpcObj object at 0x7fbc5478c390>}
        # {'_dict': {u'status': u'add', u'new_name': None, u'name': u'departments copy.md'}, 'props': <pysearpc.client._SearpcObj object at 0x7fbc5478c3d0>}

        result = {}
        result['commit_info'] = {
            'creator_email': commit.creator_name,
            'creator_name': email2nickname(commit.creator_name),
            'creator_contact_email': email2contact_email(commit.creator_name),
            'time': timestamp_to_isoformat_timestr(commit.ctime),
            'description': commit.desc,
            'device_name': commit.device_name
        }
        result['commit_diffs'] = []

        diffs = seafile_api.diff_commits(repo_id, '', commit_id)
        diff_status_dict = {
            "add": 'new',
            "del": 'removed',
            "mov": 'renamed',
            "mod": 'modified',
            "newdir": 'newdir',
            "deldir": 'deldir',
        }
        for diff in diffs:
            commit_diff = {}
            commit_diff['op_type'] = diff_status_dict.get(diff.status, '')
            commit_diff['path'] = '/' + diff.name if diff.name else ''
            commit_diff['new_path'] = '/' + diff.new_name if diff.new_name else ''
            result['commit_diffs'].append(commit_diff)

        return Response(result)

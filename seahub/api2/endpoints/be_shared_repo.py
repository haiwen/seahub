# Copyright (c) 2012-2016 Seafile Ltd.
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

import seaserv
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.utils import is_valid_username, is_org_context, send_perm_audit_msg
from seahub.share.models import ExtraSharePermission
from seahub.share.utils import check_user_share_in_permission

json_content_type = 'application/json; charset=utf-8'

class BeSharedRepo(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def delete(self, request, repo_id, format=None):

        if not seafile_api.get_repo(repo_id):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Library does not exist')

        username = request.user.username
        share_type = request.GET.get('share_type', None)
        if share_type == 'personal':

            from_email = request.GET.get('from', None)
            if not is_valid_username(from_email):
                return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid argument')

            is_org = is_org_context(request)
            repo = seafile_api.get_repo(repo_id)
            permission = check_user_share_in_permission(repo_id, username, is_org)
            if is_org:
                org_id = request.user.org.org_id
                seaserv.seafserv_threaded_rpc.org_remove_share(org_id,
                                                               repo_id,
                                                               from_email,
                                                               username)
            else:
                seaserv.remove_share(repo_id, from_email, username)

            # Delete data of ExtraSharePermission table.
            ExtraSharePermission.objects.delete_share_permission(repo_id, 
                                                                 username)
            if repo.is_virtual:
                send_perm_audit_msg('delete-repo-perm', username, username,
                        repo.origin_repo_id, repo.origin_path, permission)
            else:
                send_perm_audit_msg('delete-repo-perm', username, username,
                        repo_id, '/', permission)


        elif share_type == 'group':

            from_email = request.GET.get('from', None)
            if not is_valid_username(from_email):
                return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid argument')

            group_id = request.GET.get('group_id', None)
            group = seaserv.get_group(group_id)
            if not group:
                return api_error(status.HTTP_400_BAD_REQUEST, 'Group does not exist')

            if not seaserv.check_group_staff(group_id, username) and \
                not seafile_api.is_repo_owner(username, repo_id):
                return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied')

            if seaserv.is_org_group(group_id):
                org_id = seaserv.get_org_id_by_group(group_id)
                seaserv.del_org_group_repo(repo_id, org_id, group_id)
            else:
                seafile_api.unset_group_repo(repo_id, group_id, from_email)

        elif share_type == 'public':

            if is_org_context(request):
                org_repo_owner = seafile_api.get_org_repo_owner(repo_id)
                is_org_repo_owner = True if org_repo_owner == username else False

                if not request.user.org.is_staff and not is_org_repo_owner:
                    return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied')

                org_id = request.user.org.org_id
                seaserv.seafserv_threaded_rpc.unset_org_inner_pub_repo(org_id,
                                                                       repo_id)
            else:
                if not seafile_api.is_repo_owner(username, repo_id) and \
                    not request.user.is_staff:
                    return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied')

                seaserv.unset_inner_pub_repo(repo_id)
        else:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid argument')

        return Response({'success': True}, status=status.HTTP_200_OK)

# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from io import BytesIO
from openpyxl import load_workbook

from django.http import HttpResponse, HttpResponseRedirect
from django.utils.translation import gettext as _

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, ccnet_api
from pysearpc import SearpcError

from seahub.api2.utils import api_error
from seahub.api2.endpoints.utils import is_org_user
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils import string2list, is_org_context, get_file_type_and_ext
from seahub.group.models import GroupInviteLinkModel
from seahub.utils.ms_excel import write_xls
from seahub.utils.error_msg import file_type_error_msg
from seahub.base.accounts import User
from seahub.base.models import GROUP_MEMBER_ADD, GROUP_MEMBER_DELETE
from seahub.group.signals import add_user_to_group
from seahub.group.views import group_invite
from seahub.organizations.views import get_org_id_by_group
from seahub.group.utils import is_group_member, is_group_admin, \
    is_group_owner, is_group_admin_or_owner, get_group_member_info
from seahub.profile.models import Profile
from seahub.settings import MULTI_TENANCY
from seahub.signals import group_member_audit

from .utils import api_check_group

logger = logging.getLogger(__name__)


class GroupMembers(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_check_group
    def get(self, request, group_id, format=None):
        """
        Get all group members.
        """
        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            page = 1
            per_page = 100

        start = (page - 1) * per_page
        limit = per_page

        try:
            # only group member can get info of all group members
            if not is_group_member(group_id, request.user.username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            members = ccnet_api.get_group_members(group_id, start, limit)

        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        group_members = []
        is_admin = request.GET.get('is_admin', 'false')
        for m in members:
            # only return group admins
            if is_admin == 'true' and not m.is_staff:
                continue

            member_info = get_group_member_info(request, group_id, m.user_name)
            group_members.append(member_info)

        return Response(group_members)

    @api_check_group
    def post(self, request, group_id):
        """
        Add a group member.
        """
        username = request.user.username

        # only group owner/admin can add a group member
        if not is_group_admin_or_owner(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        email = request.data.get('email', None)
        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            if is_group_member(group_id, email):
                error_msg = _('User %s is already a group member.') % email2nickname(email)
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if is_org_context(request):
                org_id = request.user.org.org_id
                if not ccnet_api.org_user_exists(org_id, email):
                    error_msg = _('User %s not found in organization.') % email2nickname(email)
                    return api_error(status.HTTP_404_NOT_FOUND, error_msg)
            elif is_org_user(email):
                error_msg = _('User %s is an organization user.') % email
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            ccnet_api.group_add_member(group_id, username, email)
            add_user_to_group.send(sender=None,
                                   group_staff=username,
                                   group_id=group_id,
                                   added_user=email)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        member_info = get_group_member_info(request, group_id, email)

        return Response(member_info, status=status.HTTP_201_CREATED)


class GroupSearchMember(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    @api_check_group
    def get(self, request, group_id, format=None):
        """
        Search group member by email.
        """

        q = request.GET.get('q', '')
        if not q:
            error_msg = 'q invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not is_group_member(group_id, request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        group_members = []
        members = ccnet_api.search_group_members(group_id, q)
        for member in members:

            member_info = get_group_member_info(request, group_id, member.user_name)

            group_members.append(member_info)

        return Response(group_members)


class GroupMember(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    @api_check_group
    def get(self, request, group_id, email):
        """
        Get info of a specific group member.
        """
        try:
            # only group member can get info of a specific group member
            if not is_group_member(group_id, request.user.username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if not is_group_member(group_id, email):
                error_msg = 'Email %s invalid.' % email
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        member_info = get_group_member_info(request, group_id, email)

        return Response(member_info)

    @api_check_group
    def put(self, request, group_id, email):
        """
        Set/unset a specific group member as admin.
        """

        username = request.user.username
        is_admin = request.data.get('is_admin', '')
        try:
            # only group owner can set/unset a specific group member as admin
            if not is_group_owner(group_id, username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if not is_group_member(group_id, email):
                error_msg = 'Email %s invalid.' % email
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # set/unset a specific group member as admin
            if is_admin.lower() == 'true':
                ccnet_api.group_set_admin(group_id, email)
            elif is_admin.lower() == 'false':
                ccnet_api.group_unset_admin(group_id, email)
            else:
                error_msg = 'is_admin invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        member_info = get_group_member_info(request, group_id, email)

        return Response(member_info)

    @api_check_group
    def delete(self, request, group_id, email):
        """
        User leave group or group owner/admin delete a group member.
        """

        try:
            if not is_group_member(group_id, email):
                error_msg = 'Email %s invalid.' % email
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        username = request.user.username
        org_id = get_org_id_by_group(group_id)
        # user leave group
        if username == email:
            try:
                ccnet_api.quit_group(group_id, username)
                # remove repo-group share info of all 'email' owned repos
                seafile_api.remove_group_repos_by_owner(group_id, email)
                # add group invite log
                group_member_audit.send(sender=None,
                                      org_id=org_id if org_id else -1,
                                      group_id=group_id,
                                      users=[email],
                                      operator=username,
                                      operation=GROUP_MEMBER_DELETE)
                return Response({'success': True})
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # group owner/admin delete a group member
        try:
            if is_group_owner(group_id, username):
                # group owner can delete all group member
                ccnet_api.group_remove_member(group_id, username, email)
                seafile_api.remove_group_repos_by_owner(group_id, email)
                group_member_audit.send(sender=None,
                                      org_id=org_id if org_id else -1,
                                      group_id=group_id,
                                      users=[email],
                                      operator=username,
                                      operation=GROUP_MEMBER_DELETE)
                return Response({'success': True})

            elif is_group_admin(group_id, username):
                # group admin can NOT delete group owner/admin
                if not is_group_admin_or_owner(group_id, email):
                    ccnet_api.group_remove_member(group_id, username, email)
                    seafile_api.remove_group_repos_by_owner(group_id, email)
                    group_member_audit.send(sender=None,
                                          org_id=org_id if org_id else -1,
                                          group_id=group_id,
                                          users=[email],
                                          operator=username,
                                          operation=GROUP_MEMBER_DELETE)
                    return Response({'success': True})
                else:
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            else:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)


class GroupMembersBulk(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_check_group
    def post(self, request, group_id):
        """
        Bulk add group members.
        """
        username = request.user.username
        try:
            if not is_group_admin_or_owner(group_id, username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        emails_str = request.data.get('emails', '')
        emails_list = string2list(emails_str)
        emails_list = [x.lower() for x in emails_list]

        result = {}
        result['failed'] = []
        result['success'] = []
        emails_need_add = []

        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        for email in emails_list:
            email_name = email2nickname(email)
            try:
                User.objects.get(email=email)
            except User.DoesNotExist:
                result['failed'].append({
                    'email': email,
                    'email_name': email_name,
                    'error_msg': 'User %s not found.' % email_name
                    })
                continue

            if is_group_member(group_id, email, in_structure=False):
                result['failed'].append({
                    'email': email,
                    'email_name': email_name,
                    'error_msg': _('User %s is already a group member.') % email_name
                    })
                continue

            # Can only invite organization users to group
            if org_id and not ccnet_api.org_user_exists(org_id, email):
                result['failed'].append({
                    'email': email,
                    'email_name': email_name,
                    'error_msg': _('User %s not found in organization.') % email_name
                    })
                continue

            if not org_id and is_org_user(email):
                result['failed'].append({
                    'email': email,
                    'email_name': email_name,
                    'error_msg': _('User %s is an organization user.') % email_name
                    })
                continue

            emails_need_add.append(email)

        # Add user to group.
        emails_added = []
        for email in emails_need_add:
            try:
                ccnet_api.group_add_member(group_id, username, email)
                member_info = get_group_member_info(request, group_id, email)
                result['success'].append(member_info)
                emails_added.append(email)
            except SearpcError as e:
                logger.error(e)
                result['failed'].append({
                    'email': email,
                    'error_msg': 'Internal Server Error'
                    })

            add_user_to_group.send(sender=None,
                                   group_staff=username,
                                   group_id=group_id,
                                   added_user=email)
        # add group invite log
        group_member_audit.send(sender=None,
                              org_id=org_id if org_id else -1,
                              group_id=group_id,
                              users=emails_added,
                              operator=username,
                              operation=GROUP_MEMBER_ADD)
        return Response(result)


class GroupMembersImport(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, group_id):

        """ Import members from xlsx file

        Permission checking:
        1. group admin or owner.
        """

        xlsx_file = request.FILES.get('file', None)
        if not xlsx_file:
            error_msg = 'file can not be found.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_type, ext = get_file_type_and_ext(xlsx_file.name)
        if ext != 'xlsx':
            error_msg = file_type_error_msg(ext, 'xlsx')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # recourse check
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = _('Group does not exist')
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check permission
        # only group owner/admin can add group members
        username = request.user.username
        if not is_group_admin_or_owner(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        content = xlsx_file.read()

        try:
            fs = BytesIO(content)
            wb = load_workbook(filename=fs, read_only=True)
        except Exception as e:
            logger.error(e)

        # example file is like:
        # Email
        # a@a.com
        # b@b.com

        rows = wb.worksheets[0].rows
        records = []
        # skip first row(head field).
        next(rows)
        for row in rows:
            records.append([col.value for col in row])

        emails_list = []
        for record in records:
            if record[0]:
                email = str(record[0]).strip().lower()
                emails_list.append(email)

        result = {}
        result['failed'] = []
        result['success'] = []
        emails_need_add = []

        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        for email in emails_list:

            email_from_excel = email

            user_not_found = False

            try:
                User.objects.get(email=email_from_excel)
            except User.DoesNotExist:
                user_not_found = True

            if user_not_found:
                email = Profile.objects.get_username_by_contact_email(email_from_excel)
                if not email:
                    email = Profile.objects.get_username_by_login_id(email_from_excel)
                try:
                    User.objects.get(email=email)
                    user_not_found = False
                except User.DoesNotExist:
                    user_not_found = True

            if user_not_found:
                result['failed'].append({
                    'email': email_from_excel,
                    'email_name': email2nickname(email_from_excel),
                    'error_msg': 'User %s not found.' % email2nickname(email_from_excel)
                    })
                continue

            email_name = email2nickname(email)
            if is_group_member(group_id, email, in_structure=False):
                result['failed'].append({
                    'email': email,
                    'email_name': email_name,
                    'error_msg': _('User %s is already a group member.') % email_name
                    })
                continue

            # Can only invite organization users to group
            if org_id and not ccnet_api.org_user_exists(org_id, email):
                result['failed'].append({
                    'email': email,
                    'email_name': email_name,
                    'error_msg': _('User %s not found in organization.') % email_name
                    })
                continue

            if not org_id and is_org_user(email):
                result['failed'].append({
                    'email': email,
                    'email_name': email_name,
                    'error_msg': _('User %s is an organization user.') % email_name
                    })
                continue

            emails_need_add.append(email)

        # Add user to group.
        emails_added = []
        for email in emails_need_add:
            try:
                ccnet_api.group_add_member(group_id, username, email)
                member_info = get_group_member_info(request, group_id, email)
                result['success'].append(member_info)
                emails_added.append(email)
            except SearpcError as e:
                logger.error(e)
                result['failed'].append({
                    'email': email,
                    'error_msg': 'Internal Server Error'
                    })

            add_user_to_group.send(sender=None,
                                   group_staff=username,
                                   group_id=group_id,
                                   added_user=email)

        group_member_audit.send(sender=None,
                              org_id=org_id if org_id else -1,
                              group_id=group_id,
                              users=emails_added,
                              operator=username,
                              operation=GROUP_MEMBER_ADD)
            
        return Response(result)


class GroupMembersImportExample(APIView):

    throttle_classes = (UserRateThrottle, )

    def get(self, request):

        data_list = []
        head = [_('Email or LoginID')]
        for i in range(5):
            username = "test" + str(i) + "@example.com"
            data_list.append([username])
            
        for i in range(5):
            login_id = "ID" + str(i)
            data_list.append([login_id])

        wb = write_xls('sample', head, data_list)
        if not wb:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, _('Failed to export Excel'))

        response = HttpResponse(content_type='application/ms-excel')
        response['Content-Disposition'] = 'attachment; filename=members.xlsx'
        wb.save(response)

        return response


class GroupInviteLinks(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    @api_check_group
    def get(self, request, group_id):
        """
        Get invitation link
        """
        group_id = int(group_id)
        email = request.user.username

        if MULTI_TENANCY:
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        group = ccnet_api.get_group(group_id)
        if group.creator_name == "system admin":
            error_msg = 'Forbidden to operate department group'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not is_group_admin_or_owner(group_id, email):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            invite_link_query_set = GroupInviteLinkModel.objects.filter(group_id=group_id)
        except Exception as e:
            logger.error(f'query group invite links failed. {e}')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'group_invite_link_list': [group_invite_link.to_dict() for group_invite_link in
                                                    invite_link_query_set]})

    @api_check_group
    def post(self, request, group_id):
        group_id = int(group_id)
        email = request.user.username
        if MULTI_TENANCY:
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        group = ccnet_api.get_group(group_id)
        if group.creator_name == "system admin":
            error_msg = 'Forbidden to operate department group'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not is_group_admin_or_owner(group_id, email):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            invite_link = GroupInviteLinkModel.objects.create_link(group_id, email)
        except Exception as e:
            logger.error(f'create group invite links failed. {e}')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response(invite_link.to_dict())


class GroupInviteLink(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    @api_check_group
    def delete(self, request, group_id, token):
        group_id = int(group_id)
        email = request.user.username

        if MULTI_TENANCY:
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        group = ccnet_api.get_group(group_id)
        if group.creator_name == "system admin":
            error_msg = 'Forbidden to operate department group'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not is_group_admin_or_owner(group_id, email):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            GroupInviteLinkModel.objects.filter(token=token, group_id=group_id).delete()
        except Exception as e:
            logger.error(f'delete group invite links failed. {e}')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})

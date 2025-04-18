# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import json
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api
from pysearpc import SearpcError
from django.urls import reverse
from django.utils import timezone

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsRepoAccessible
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, user_to_dict, to_python_boolean
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.base.models import FileComment
from seahub.utils.repo import get_repo_owner
from seahub.signals import comment_file_successful
from seahub.api2.endpoints.utils import generate_links_header_for_paginator
from seahub.views import check_folder_permission

from seahub.seadoc.models import SeadocCommentReply, SeadocNotification
from seahub.file_participants.models import FileParticipant
from seahub.utils.timeutils import utc_to_local, datetime_to_isoformat_timestr, datetime_to_timestamp

logger = logging.getLogger(__name__)


class FileCommentsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoAccessible)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, file_uuid):
        """list comments of a sdoc, same as FileCommentsView
        """

        resolved = request.GET.get('resolved', None)
        if resolved not in ('true', 'false', None):
            error_msg = 'resolved invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        start = None
        end = None
        page = request.GET.get('page', '')
        if page:
            try:
                page = int(request.GET.get('page', '1'))
                per_page = int(request.GET.get('per_page', '25'))
            except ValueError:
                page = 1
                per_page = 25
            start = (page - 1) * per_page
            end = page * per_page

        total_count = FileComment.objects.list_by_file_uuid(file_uuid).count()
        comments = []

        if resolved is None:
            file_comments = FileComment.objects.list_by_file_uuid(file_uuid)[start: end]
        else:
            comment_resolved = to_python_boolean(resolved)
            file_comments = (
                FileComment.objects
                .list_by_file_uuid(file_uuid)
                .filter(resolved=comment_resolved)
                [start:end]
            )

        reply_queryset = SeadocCommentReply.objects.list_by_doc_uuid(file_uuid)

        for file_comment in file_comments:
            comment = file_comment.to_dict(reply_queryset)
            comment.update(user_to_dict(file_comment.author, request=request))
            comments.append(comment)

        result = {'comments': comments, 'total_count': total_count}
        return Response(result)

    def post(self, request, repo_id, file_uuid):
        
        comment = request.data.get('comment', '')
        detail = request.data.get('detail', '')
        author = request.data.get('author', '')
        username = request.user.username
        if comment is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'comment invalid.')
        if not username:
            return api_error(status.HTTP_400_BAD_REQUEST, 'author invalid.')

        file_comment = FileComment.objects.add_by_file_uuid(
            file_uuid, username, comment, detail)
        comment = file_comment.to_dict()
        comment.update(user_to_dict(username, request=request))

        # notification
        to_users = set()
        participant_queryset = FileParticipant.objects.get_participants(file_uuid)
        for participant in participant_queryset:
            to_users.add(participant.username)
        to_users.discard(username)  # remove author
        to_users = list(to_users)
        detail = {
            'author': username,
            'comment_id': int(file_comment.id),
            'comment': str(file_comment.comment),
            'msg_type': 'comment',
            'created_at': datetime_to_isoformat_timestr(file_comment.created_at),
            'updated_at': datetime_to_isoformat_timestr(file_comment.updated_at),
        }
        detail.update(user_to_dict(username, request=request))

        new_notifications = []
        for to_user in to_users:
            new_notifications.append(
                SeadocNotification(
                    doc_uuid=file_uuid,
                    username=to_user,
                    msg_type='comment',
                    detail=json.dumps(detail),
                ))
        try:
            SeadocNotification.objects.bulk_create(new_notifications)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        #
        notification = detail
        notification['to_users'] = to_users
        comment['notification'] = notification
        return Response(comment)


class FileCommentView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoAccessible)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, file_uuid, comment_id):
        # resource check
        try:
            file_comment = FileComment.objects.get(pk=comment_id)
        except FileComment.DoesNotExist:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong comment id')
        if str(file_comment.uuid.uuid) != file_uuid:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found: %s' % comment_id)

        comment = file_comment.to_dict()
        comment.update(user_to_dict(
            file_comment.author, request=request))
        return Response(comment)

    def delete(self, request, repo_id, file_uuid, comment_id):

        # resource check
        try:
            file_comment = FileComment.objects.get(pk=comment_id)
        except FileComment.DoesNotExist:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong comment id')
        if str(file_comment.uuid.uuid) != file_uuid:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found: %s' % comment_id)

        file_comment.delete()
        SeadocCommentReply.objects.filter(comment_id=comment_id).delete()
        return Response({'success': True})

    def put(self, request, repo_id, file_uuid, comment_id):

        # argument check
        resolved = request.data.get('resolved')
        if resolved not in ('true', 'false', None):
            error_msg = 'resolved invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        detail = request.data.get('detail')
        comment = request.data.get('comment')

        # resource check
        try:
            file_comment = FileComment.objects.get(pk=comment_id)
        except FileComment.DoesNotExist:
            error_msg = 'FileComment %s not found.' % comment_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        if str(file_comment.uuid.uuid) != file_uuid:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found: %s' % comment_id)

        if resolved is not None:
            # do not refresh updated_at
            comment_resolved = to_python_boolean(resolved)
            file_comment.resolved = comment_resolved
            file_comment.save(update_fields=['resolved'])

        if detail is not None or comment is not None:
            if detail is not None:
                file_comment.detail = detail
            if comment is not None:
                file_comment.comment = comment
            # save
            file_comment.updated_at = timezone.now()
            file_comment.save()

        comment = file_comment.to_dict()
        comment.update(user_to_dict(file_comment.author, request=request))
        return Response(comment)


class FileCommentRepliesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoAccessible)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, file_uuid, comment_id):
        start = None
        end = None
        page = request.GET.get('page', '')
        if page:
            try:
                page = int(request.GET.get('page', '1'))
                per_page = int(request.GET.get('per_page', '25'))
            except ValueError:
                page = 1
                per_page = 25
            start = (page - 1) * per_page
            end = page * per_page

        # resource check
        file_comment = FileComment.objects.filter(
            id=comment_id, uuid=file_uuid).first()
        if not file_comment:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found.')

        total_count = SeadocCommentReply.objects.list_by_comment_id(comment_id).count()
        replies = []
        reply_queryset = SeadocCommentReply.objects.list_by_comment_id(comment_id)[start: end]
        for reply in reply_queryset:
            data = reply.to_dict()
            data.update(
                user_to_dict(reply.author, request=request))
            replies.append(data)

        result = {'replies': replies, 'total_count': total_count}
        return Response(result)

    def post(self, request, repo_id, file_uuid, comment_id):
        """post a comment reply of a sdoc.
        """

        reply_content = request.data.get('reply', '')
        type_content = request.data.get('type', 'reply')
        author = request.data.get('author', '')
        username = request.user.username or author
        if reply_content is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'reply invalid.')
        if not username:
            return api_error(status.HTTP_400_BAD_REQUEST, 'author invalid.')

        # resource check
        file_comment = FileComment.objects.filter(
            id=comment_id, uuid=file_uuid).first()
        if not file_comment:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found.')

        reply = SeadocCommentReply.objects.create(
            author=username,
            reply=str(reply_content),
            type=str(type_content),
            comment_id=comment_id,
            doc_uuid=file_uuid,
        )
        data = reply.to_dict()
        data.update(
            user_to_dict(reply.author, request=request))

        # notification
        to_users = set()
        participant_queryset = FileParticipant.objects.get_participants(file_uuid)
        for participant in participant_queryset:
            to_users.add(participant.username)
        to_users.discard(username)  # remove author
        to_users = list(to_users)
        detail = {
            'author': username,
            'comment_id': int(comment_id),
            'reply_id': reply.pk,
            'reply': str(reply_content),
            'msg_type': 'reply',
            'created_at': datetime_to_isoformat_timestr(reply.created_at),
            'updated_at': datetime_to_isoformat_timestr(reply.updated_at),
            'is_resolved': type(reply_content) is bool and reply_content is True,
            'resolve_comment': file_comment.comment.strip()
        }
        detail.update(user_to_dict(username, request=request))

        new_notifications = []
        for to_user in to_users:
            new_notifications.append(
                SeadocNotification(
                    doc_uuid=file_uuid,
                    username=to_user,
                    msg_type='reply',
                    detail=json.dumps(detail),
                ))
        try:
            SeadocNotification.objects.bulk_create(new_notifications)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        #
        notification = detail
        notification['to_users'] = to_users
        data['notification'] = notification
        return Response(data)


class FileCommentReplyView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoAccessible)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, file_uuid, comment_id, reply_id):
        """Get a comment reply
        """
        # resource check
        file_comment = FileComment.objects.filter(
            id=comment_id, uuid=file_uuid).first()
        if not file_comment:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found.')

        reply = SeadocCommentReply.objects.filter(
            id=reply_id, doc_uuid=file_uuid, comment_id=comment_id).first()
        if not reply:
            return api_error(status.HTTP_404_NOT_FOUND, 'reply not found.')

        data = reply.to_dict()
        data.update(
            user_to_dict(reply.author, request=request))
        return Response(data)

    def delete(self, request, repo_id, file_uuid, comment_id, reply_id):

        # resource check
        file_comment = FileComment.objects.filter(
            id=comment_id, uuid=file_uuid).first()
        if not file_comment:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found.')

        reply = SeadocCommentReply.objects.filter(
            id=reply_id, doc_uuid=file_uuid, comment_id=comment_id).first()
        if not reply:
            return api_error(status.HTTP_404_NOT_FOUND, 'reply not found.')
        reply.delete()
        return Response({'success': True})

    def put(self, request, repo_id, file_uuid, comment_id, reply_id):
        # argument check
        reply_content = request.data.get('reply')
        if reply_content is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'reply invalid.')

        # resource check
        file_comment = FileComment.objects.filter(
            id=comment_id, uuid=file_uuid).first()
        if not file_comment:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found.')

        reply = SeadocCommentReply.objects.filter(
            id=reply_id, doc_uuid=file_uuid, comment_id=comment_id).first()
        if not reply:
            return api_error(status.HTTP_404_NOT_FOUND, 'reply not found.')

        # save
        reply.reply = str(reply_content)
        reply.updated_at = timezone.now()
        reply.save()

        data = reply.to_dict()
        data.update(
            user_to_dict(reply.author, request=request))
        return Response(data)

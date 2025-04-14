# Copyright (c) 2012-2016 Seafile Ltd.
import logging

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

from seahub.seadoc.models import SeadocCommentReply
from seahub.file_participants.models import FileParticipant
from seahub.utils.timeutils import utc_to_local, datetime_to_isoformat_timestr, datetime_to_timestamp

logger = logging.getLogger(__name__)


class FileCommentsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoAccessible)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        """List all comments of a file.
        """
        path = request.GET.get('p', '/').rstrip('/')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong path.')

        file_uuid = request.GET.get('docuuid', None)
        resolved = request.GET.get('resolved', None)
        if resolved not in ('true', 'false', None):
            error_msg = 'resolved invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if check_folder_permission(request, repo_id, '/') is None:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25

        start = (page - 1) * per_page
        end = page * per_page 

        total_count = FileComment.objects.get_by_file_path(repo_id, path).count()
        comments = []

        if resolved is None:
            file_comments = FileComment.objects.get_by_file_path(repo_id, path)[start: end]
        else:
            comment_resolved = to_python_boolean(resolved)
            file_comments = FileComment.objects.get_by_file_path(repo_id, path).filter(resolved=comment_resolved)[start: end]

        reply_queryset = SeadocCommentReply.objects.list_by_doc_uuid(file_uuid)

        for file_comment in file_comments:
            comment = file_comment.to_dict(reply_queryset)
            comment.update(user_to_dict(file_comment.author, request=request))
            comments.append(comment)

        result = {'comments': comments, 'total_count': total_count}
        resp = Response(result)
        base_url = reverse('api2-file-comments', args=[repo_id])
        links_header = generate_links_header_for_paginator(base_url, page, per_page, total_count)
        resp['Links'] = links_header
        return resp

    def post(self, request, repo_id, format=None):
        """Post a comments of a file.
        """
        path = request.GET.get('p', '/').rstrip('/')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong path.')

        comment = request.data.get('comment', '')
        if not comment:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Comment can not be empty.')

        try:
            avatar_size = int(request.GET.get('avatar_size',
                                              AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                             'Internal Server Error')
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        if check_folder_permission(request, repo_id, '/') is None:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        detail = request.data.get('detail', '')
        username = request.user.username
        file_comment = FileComment.objects.add_by_file_path(
            repo_id=repo_id, file_path=path, author=username, comment=comment, detail=detail)
        repo = seafile_api.get_repo(repo_id)
        repo_owner = get_repo_owner(request, repo.id)
        
        comment_file_successful.send(sender=None, repo=repo, repo_owner=repo_owner, file_path=path, comment=comment, author=username)

        comment = file_comment.to_dict()
        comment.update(user_to_dict(username, request=request))
        return Response(comment, status=201)


class FileCommentRepliesView(APIView):
    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, file_uuid, comment_id):
        """list replies
        """
        # auth = request.headers.get('authorization', '').split()
        # if not is_valid_seadoc_access_token(auth, file_uuid):
        #     error_msg = 'Permission denied.'
        #     return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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
        """post a reply
        """
        # argument check
        # auth = request.headers.get('authorization', '').split()
        # is_valid, payload = is_valid_seadoc_access_token(auth, file_uuid, return_payload=True)
        # if not is_valid:
        #     error_msg = 'Permission denied.'
        #     return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        reply_content = request.data.get('reply', '')
        type_content = request.data.get('type', 'reply')
        author = request.data.get('author', '')
        username = author

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
        data.update(user_to_dict(reply.author, request=request))

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

        # new_notifications = []
        # for to_user in to_users:
        #     new_notifications.append(
        #         SeadocNotification(
        #             doc_uuid=file_uuid,
        #             username=to_user,
        #             msg_type='reply',
        #             detail=json.dumps(detail),
        #         ))
        # try:
        #     SeadocNotification.objects.bulk_create(new_notifications)
        # except Exception as e:
        #     logger.error(e)
        #     error_msg = 'Internal Server Error'
        #     return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        notification = detail
        notification['to_users'] = to_users
        data['notification'] = notification
        return Response(data)


class FileCommentReplyView(APIView):
    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, file_uuid, comment_id, reply_id):
        """Get a comment reply
        """
        # auth = request.headers.get('authorization', '').split()
        # if not is_valid_seadoc_access_token(auth, file_uuid):
        #     error_msg = 'Permission denied.'
        #     return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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
        """Delete a comment reply
        """
        # auth = request.headers.get('authorization', '').split()
        # if not is_valid_seadoc_access_token(auth, file_uuid):
        #     error_msg = 'Permission denied.'
        #     return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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
        """Update a comment reply
        """
        # auth = request.headers.get('authorization', '').split()
        # if not is_valid_seadoc_access_token(auth, file_uuid):
        #     error_msg = 'Permission denied.'
        #     return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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

import json
import logging
import re

from django.db import transaction
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, is_wiki_repo
from seahub.base.models import Webhooks, WebhookJobs
from seahub.share.utils import is_repo_admin, normalize_custom_permission_name
from seaserv import seafile_api

logger = logging.getLogger(__name__)

class WebhooksView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if is_wiki_repo(repo):
            error_msg = 'Webhooks are not supported for wikis.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        # permission check
        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        webhooks = Webhooks.objects.filter(repo_id = repo_id)
        return Response({'webhook_list': [hook.to_dict() for hook in webhooks]})

    def post(self, request, repo_id):
        # arguments check
        url = request.data.get('url')
        url = url.strip() if url else url
        if not url:
            return api_error(status.HTTP_400_BAD_REQUEST, 'url invalid.')
        if not re.match(r'^https?://', url):
            return api_error(status.HTTP_400_BAD_REQUEST, 'url invalid')

        secret = request.data.get('secret')
        secret = secret.strip() if secret else secret
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if is_wiki_repo(repo):
            error_msg = 'Webhooks are not supported for wikis.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        # permission check
        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        if Webhooks.objects.filter(repo_id=repo_id, url=url).exists():
            return api_error(status.HTTP_409_CONFLICT, 'Webhook exists.')

        data = {
            'repo_id': repo_id,
            'url': url,
            'creator': request.user.username
        }
        if secret:
            settings = json.dumps({
                'secret': secret
            })
            data['settings'] = settings
        try:
            webhook = Webhooks.objects.create(**data)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error.')

        return Response({'webhook': webhook.to_dict()})


    def put(self, request, repo_id, webhook_id):
        # arguments check
        url = request.data.get('url')
        if url:
            url = url.strip()
        if not re.match(r'^https?://', url):
            return api_error(status.HTTP_400_BAD_REQUEST, 'url invalid')
        secret = request.data.get('secret')
        if secret:
            secret = secret.strip()

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if is_wiki_repo(repo):
            error_msg = 'Webhooks are not supported for wikis.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        webhook = Webhooks.objects.filter(id=webhook_id, repo_id=repo_id).first()
        if not webhook:
            return api_error(status.HTTP_404_NOT_FOUND, 'Webhook not found.')
        
        # permission check
        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if Webhooks.objects.filter(repo_id=repo_id, url=url).exclude(id=webhook_id).exists():
            return api_error(status.HTTP_409_CONFLICT, 'Webhook exists.')

        # update
        if url:
            webhook.url = url
        if secret:
            hook_settings = webhook.hook_settings
            if hook_settings:
                hook_settings['secret'] = secret
            else:
                hook_settings = {'secret': secret}
            webhook.settings = json.dumps(hook_settings)
        webhook.is_valid = True
        try:
            webhook.save()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error.')

        return Response({
            'webhook': webhook.to_dict()
        })

    def delete(self, request, repo_id, webhook_id):
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if is_wiki_repo(repo):
            error_msg = 'Webhooks are not supported for wikis.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        webhook = Webhooks.objects.filter(id=webhook_id, repo_id=repo_id).first()
        if not webhook:
            return api_error(status.HTTP_404_NOT_FOUND, 'Webhook not found.')
        
        # permission check
        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        with transaction.atomic():
            try:
                Webhooks.objects.filter(id=webhook_id).delete()
                WebhookJobs.objects.filter(webhook_id=webhook_id).delete()
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error.')

        return Response({'success': True})
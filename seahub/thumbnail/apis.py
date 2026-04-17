# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
import datetime

from django.utils.translation import gettext as _
from django.http import HttpResponse
from django.views.decorators.http import condition
from django.utils.decorators import method_decorator
from seaserv import get_repo, get_file_id_by_path

from seahub.views import check_folder_permission
from seahub.settings import THUMBNAIL_EXTENSION, \
    THUMBNAIL_ROOT
import seahub.settings as settings
from seahub.thumbnail.utils import generate_thumbnail, generate_thumbnail_key
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle


# Get an instance of a logger
logger = logging.getLogger(__name__)

THUMBNAIL_CACHE_DAYS = getattr(settings, 'THUMBNAIL_CACHE_DAYS', 7)

def latest_entry(request, repo_id, size, path):
    """Get the last modified time of the thumbnail file."""
    thumbnail_key = generate_thumbnail_key(repo_id, path)
    try:
        thumbnail_file = os.path.join(THUMBNAIL_ROOT, str(size), thumbnail_key)
        last_modified_time = os.path.getmtime(thumbnail_file)
        # convert float to datetime obj
        return datetime.datetime.fromtimestamp(last_modified_time)
    except os.error:
        return None
    except Exception as e:
        logger.error(e, exc_info=True)
        return None

class ThumbnailGet(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)
    @method_decorator(condition(last_modified_func=latest_entry))
    def get(self, request, repo_id, size, path):
        """ handle thumbnail src from repo file list

        return thumbnail file to web
        """
        repo = get_repo(repo_id)
        obj_id = get_file_id_by_path(repo_id, path)
        # check if file exist
        if not repo or not obj_id:
            return HttpResponse()

        # check if is allowed
        if repo.encrypted or check_folder_permission(request, repo_id, path) is None:
            return HttpResponse()

        try:
            size = int(size)
        except ValueError as e:
            logger.error(e)
            return HttpResponse()

        # Use MD5 of repo_id + path as thumbnail filename
        thumbnail_key = generate_thumbnail_key(repo_id, path)
        thumbnail_file = os.path.join(THUMBNAIL_ROOT, str(size), thumbnail_key)
        
        success, status_code = generate_thumbnail(request, repo_id, size, path)

        if success:
            try:
                with open(thumbnail_file, 'rb') as f:
                    thumbnail = f.read()
                resp = HttpResponse(content=thumbnail,
                                    content_type='image/' + THUMBNAIL_EXTENSION)

                resp['Cache-Control'] = 'private, max-age=%s' % (3600 * 24 * THUMBNAIL_CACHE_DAYS)
                return resp
            except IOError as e:
                logger.error(e)
                return HttpResponse(status=500)
        else:
            return HttpResponse(status=status_code)


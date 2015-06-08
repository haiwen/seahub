import os
import json
import logging
import posixpath
import datetime

from django.utils.translation import ugettext as _
from django.http import HttpResponse
from django.views.decorators.http import condition

from seaserv import get_repo

from seahub.views import check_folder_permission
from seahub.settings import THUMBNAIL_DEFAULT_SIZE, THUMBNAIL_EXTENSION, \
    THUMBNAIL_ROOT
from seahub.thumbnail.utils import allow_generate_thumbnail, generate_thumbnail
from seahub.share.models import FileShare

# Get an instance of a logger
logger = logging.getLogger(__name__)

def thumbnail_create(request, repo_id):
    """
    generate thumbnail if not exists
    return thumbnail src to web
    """

    content_type = 'application/json; charset=utf-8'
    result = {}

    if not request.is_ajax():
        err_msg = _(u"Permission denied.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u"Library does not exist.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    # permission check
    path = request.GET.get('path', None)
    image_path = path
    if not path or '../' in path:
        err_msg = _(u"Invalid arguments.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    token = request.GET.get('t', None)
    if token:
        fileshare = FileShare.objects.get_valid_file_link_by_token(token)
        if not fileshare or fileshare.repo_id != repo_id :
            err_msg = _(u"Permission denied.")
            return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                                content_type=content_type)

        if fileshare.path == '/':
            image_path = path
        else:
            image_path = posixpath.join(fileshare.path, path.lstrip('/'))
    else:
        if not request.user.is_authenticated():
            err_msg = _(u"Please login first.")
            return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                                content_type=content_type)
        elif check_folder_permission(request, repo_id, '/') is None:
            err_msg = _(u"Permission denied.")
            return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                                content_type=content_type)

    if not allow_generate_thumbnail(request, repo_id, image_path):
        err_msg = _(u"Not allowed to generate thumbnail.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)
    else:
        size = request.GET.get('size', THUMBNAIL_DEFAULT_SIZE)
        scr = generate_thumbnail(request, repo_id, image_path, int(size))
        if scr:
            result['thumbnail_src'] = scr
            return HttpResponse(json.dumps(result), content_type=content_type)
        else:
            err_msg = _('Failed to create thumbnail.')
            return HttpResponse(json.dumps({'err_msg': err_msg}), status=500,
                                content_type=content_type)

def latest_entry(request, repo_id, obj_id, size=THUMBNAIL_DEFAULT_SIZE):
    thumbnail_path = os.path.join(THUMBNAIL_ROOT, size, obj_id)
    last_modified_time = os.path.getmtime(thumbnail_path)
    try:
        # convert float to datatime obj
        return datetime.datetime.fromtimestamp(last_modified_time)
    except Exception as e:
        logger.error(e)
        return None

@condition(last_modified_func=latest_entry)
def thumbnail_get(request, repo_id, obj_id, size=THUMBNAIL_DEFAULT_SIZE):
    """
    handle thumbnail src
    return thumbnail file to web
    """

    token = request.GET.get('t', None)
    path = request.GET.get('p', None)
    if token and path:
        fileshare = FileShare.objects.get_valid_file_link_by_token(token)
        if not fileshare or fileshare.repo_id != repo_id :
            # check if is valid download link share token and
            # if is a valid repo/dir belonged to this file share
            return HttpResponse()
    else:
        if not request.user.is_authenticated():
            return HttpResponse()
        elif check_folder_permission(request, repo_id, '/') is None:
            return HttpResponse()

    thumbnail_file = os.path.join(THUMBNAIL_ROOT, str(size), obj_id)
    try:
        with open(thumbnail_file, 'rb') as f:
            thumbnail = f.read()
        return HttpResponse(content=thumbnail, mimetype='image/'+THUMBNAIL_EXTENSION)
    except IOError as e:
        logger.error(e)
        return HttpResponse()

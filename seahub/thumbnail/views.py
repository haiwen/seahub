# Copyright (c) 2012-2016 Seafile Ltd.
import os
import json
import logging
import posixpath
import datetime

from django.utils.translation import ugettext as _
from django.utils.http import urlquote
from django.http import HttpResponse
from django.views.decorators.http import condition
from django.shortcuts import render_to_response
from django.template import RequestContext

from seaserv import get_repo, get_file_id_by_path

from seahub.auth.decorators import login_required_ajax, login_required
from seahub.views import check_folder_permission
from seahub.settings import THUMBNAIL_DEFAULT_SIZE, THUMBNAIL_EXTENSION, \
    THUMBNAIL_ROOT, ENABLE_THUMBNAIL
from seahub.thumbnail.utils import generate_thumbnail, \
    get_thumbnail_src, get_share_link_thumbnail_src
from seahub.share.models import FileShare, check_share_link_common

# Get an instance of a logger
logger = logging.getLogger(__name__)

@login_required_ajax
def thumbnail_create(request, repo_id):
    """create thumbnail from repo file list

    return thumbnail src
    """

    content_type = 'application/json; charset=utf-8'
    result = {}

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u"Library does not exist.")
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    path = request.GET.get('path', None)
    if not path:
        err_msg = _(u"Invalid arguments.")
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    if repo.encrypted or not ENABLE_THUMBNAIL or \
        check_folder_permission(request, repo_id, path) is None:
        err_msg = _(u"Permission denied.")
        return HttpResponse(json.dumps({"error": err_msg}), status=403,
                            content_type=content_type)

    size = request.GET.get('size', THUMBNAIL_DEFAULT_SIZE)
    success, status_code = generate_thumbnail(request, repo_id, size, path)
    if success:
        src = get_thumbnail_src(repo_id, size, path)
        result['encoded_thumbnail_src'] = urlquote(src)
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        err_msg = _('Failed to create thumbnail.')
        return HttpResponse(json.dumps({'err_msg': err_msg}),
                status=status_code, content_type=content_type)

def latest_entry(request, repo_id, size, path):
    obj_id = get_file_id_by_path(repo_id, path)
    if obj_id:
        try:
            thumbnail_file = os.path.join(THUMBNAIL_ROOT, str(size), obj_id)
            last_modified_time = os.path.getmtime(thumbnail_file)
            # convert float to datatime obj
            return datetime.datetime.fromtimestamp(last_modified_time)
        except Exception as e:
            # no thumbnail file exists
            logger.error(e)
            return None
    else:
        return None

@login_required
@condition(last_modified_func=latest_entry)
def thumbnail_get(request, repo_id, size, path):
    """ handle thumbnail src from repo file list

    return thumbnail file to web
    """

    repo = get_repo(repo_id)
    obj_id = get_file_id_by_path(repo_id, path)

    # check if file exist
    if not repo or not obj_id:
        return HttpResponse()

    # check if is allowed
    if repo.encrypted or not ENABLE_THUMBNAIL or \
        check_folder_permission(request, repo_id, path) is None:
        return HttpResponse()

    try:
        size = int(size)
    except ValueError as e:
        logger.error(e)
        return HttpResponse()

    success = True
    thumbnail_file = os.path.join(THUMBNAIL_ROOT, str(size), obj_id)
    if not os.path.exists(thumbnail_file):
        success, status_code = generate_thumbnail(request, repo_id, size, path)

    if success:
        try:
            with open(thumbnail_file, 'rb') as f:
                thumbnail = f.read()
            return HttpResponse(content=thumbnail,
                                content_type='image/' + THUMBNAIL_EXTENSION)
        except IOError as e:
            logger.error(e)
            return HttpResponse()
    else:
        return HttpResponse()

def get_real_path_by_fs_and_req_path(fileshare, req_path):
    """ Return the real path of a file.

    The file could be a file in a shared dir or a shared file.
    """

    if fileshare.s_type == 'd':
        if fileshare.path == '/':
            real_path = req_path
        else:
            real_path = posixpath.join(fileshare.path, req_path.lstrip('/'))
    else:
        real_path = fileshare.path

    return real_path

def share_link_thumbnail_create(request, token):
    """generate thumbnail from dir download link page

    return thumbnail src to web
    """

    content_type = 'application/json; charset=utf-8'
    result = {}

    fileshare = FileShare.objects.get_valid_file_link_by_token(token)
    if not fileshare:
        err_msg = _(u"Invalid token.")
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    repo_id = fileshare.repo_id
    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u"Library does not exist.")
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    if repo.encrypted or not ENABLE_THUMBNAIL:
        err_msg = _(u"Permission denied.")
        return HttpResponse(json.dumps({"error": err_msg}), status=403,
                            content_type=content_type)

    req_path = request.GET.get('path', None)
    if not req_path or '../' in req_path:
        err_msg = _(u"Invalid arguments.")
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    real_path = get_real_path_by_fs_and_req_path(fileshare, req_path)

    size = request.GET.get('size', THUMBNAIL_DEFAULT_SIZE)
    success, status_code = generate_thumbnail(request, repo_id, size, real_path)
    if success:
        src = get_share_link_thumbnail_src(token, size, req_path)
        result['encoded_thumbnail_src'] = urlquote(src)
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        err_msg = _('Failed to create thumbnail.')
        return HttpResponse(json.dumps({'err_msg': err_msg}),
                status=status_code, content_type=content_type)

def share_link_latest_entry(request, token, size, path):
    fileshare = FileShare.objects.get_valid_file_link_by_token(token)
    if not fileshare:
        return None

    repo_id = fileshare.repo_id
    repo = get_repo(repo_id)
    if not repo:
        return None

    image_path = get_real_path_by_fs_and_req_path(fileshare, path)

    obj_id = get_file_id_by_path(repo_id, image_path)
    if obj_id:
        try:
            thumbnail_file = os.path.join(THUMBNAIL_ROOT, str(size), obj_id)
            last_modified_time = os.path.getmtime(thumbnail_file)
            # convert float to datatime obj
            return datetime.datetime.fromtimestamp(last_modified_time)
        except Exception as e:
            logger.error(e)
            # no thumbnail file exists
            return None
    else:
        return None

@condition(last_modified_func=share_link_latest_entry)
def share_link_thumbnail_get(request, token, size, path):
    """ handle thumbnail src from dir download link page

    return thumbnail file to web
    """

    try:
        size = int(size)
    except ValueError as e:
        logger.error(e)
        return HttpResponse()

    fileshare = FileShare.objects.get_valid_file_link_by_token(token)
    if not fileshare:
        return HttpResponse()

    password_check_passed, err_msg = check_share_link_common(request, fileshare)
    if not password_check_passed:
        d = {'token': token, 'view_name': 'view_shared_dir', 'err_msg': err_msg}
        return render_to_response('share_access_validation.html', d,
                                  context_instance=RequestContext(request))

    image_path = get_real_path_by_fs_and_req_path(fileshare, path)

    repo_id = fileshare.repo_id
    repo = get_repo(repo_id)
    obj_id = get_file_id_by_path(repo_id, image_path)

    # check if file exist
    if not repo or not obj_id:
        return HttpResponse()

    # check if is allowed
    if repo.encrypted or not ENABLE_THUMBNAIL:
        return HttpResponse()

    success = True
    thumbnail_file = os.path.join(THUMBNAIL_ROOT, str(size), obj_id)
    if not os.path.exists(thumbnail_file):
        success, status_code = generate_thumbnail(request, repo_id, size, image_path)

    if success:
        try:
            with open(thumbnail_file, 'rb') as f:
                thumbnail = f.read()
            return HttpResponse(content=thumbnail,
                                content_type='image/' + THUMBNAIL_EXTENSION)
        except IOError as e:
            logger.error(e)
            return HttpResponse()
    else:
        return HttpResponse()

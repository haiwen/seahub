import os
import json
import logging
import urllib2
from StringIO import StringIO
import posixpath
import datetime

from django.utils.translation import ugettext as _
from django.http import HttpResponse
from django.views.decorators.http import condition

from seaserv import get_repo, get_file_id_by_path, seafile_api

from seahub.views import check_folder_permission
from seahub.settings import THUMBNAIL_DEFAULT_SIZE, THUMBNAIL_EXTENSION, \
    THUMBNAIL_ROOT
from seahub.utils import gen_inner_file_get_url
from seahub.thumbnail.utils import allow_generate_thumbnail, \
    generate_thumbnail, get_thumbnail_src
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
        if generate_thumbnail(request, repo_id, int(size), image_path):
            if token:
                src = get_thumbnail_src(repo_id, size, path)
            else:
                src = get_thumbnail_src(repo_id, size, image_path)

            result['thumbnail_src'] = src
            return HttpResponse(json.dumps(result), content_type=content_type)
        else:
            err_msg = _('Failed to create thumbnail.')
            return HttpResponse(json.dumps({'err_msg': err_msg}), status=500,
                                content_type=content_type)

def latest_entry(request, repo_id, size, path):
    obj_id = get_file_id_by_path(repo_id, path)
    if obj_id:
        try:
            thumbnail_file = os.path.join(THUMBNAIL_ROOT, str(size), obj_id)
            last_modified_time = os.path.getmtime(thumbnail_file)
            # convert float to datatime obj
            return datetime.datetime.fromtimestamp(last_modified_time)
        except OSError:
            # no thumbnail file exists
            return None
    else:
        return None

@condition(last_modified_func=latest_entry)
def thumbnail_get(request, repo_id, size, path):
    """
    handle thumbnail src
    return thumbnail file to web
    """

    token = request.GET.get('t', None)
    fallback = request.GET.get('fallback', None)
    image_path = path

    if token and path:
        fileshare = FileShare.objects.get_valid_file_link_by_token(token)
        if not fileshare or fileshare.repo_id != repo_id :
            # check if is valid download link share token and
            # if is a valid repo/dir belonged to this file share
            return HttpResponse()

        if fileshare.path == '/':
            image_path = path
        else:
            image_path = posixpath.join(fileshare.path, path.lstrip('/'))
    else:
        if not request.user.is_authenticated():
            return HttpResponse()
        elif check_folder_permission(request, repo_id, '/') is None:
            return HttpResponse()

    obj_id = get_file_id_by_path(repo_id, image_path)
    thumbnail_file = os.path.join(THUMBNAIL_ROOT, str(size), obj_id)

    if not os.path.exists(thumbnail_file):
        if allow_generate_thumbnail(request, repo_id, image_path):
            generate_thumbnail(request, repo_id, int(size), image_path)
        elif fallback:
            token = seafile_api.get_fileserver_access_token(repo_id, obj_id, 'view',
                                                            request.user.username,
                                                            use_onetime = False)
            inner_path = gen_inner_file_get_url(token, os.path.basename(image_path))
            image_file = urllib2.urlopen(inner_path)
            f = StringIO(image_file.read())
            return HttpResponse(content=f, mimetype='image/'+THUMBNAIL_EXTENSION)

    try:
        with open(thumbnail_file, 'rb') as f:
            thumbnail = f.read()
        return HttpResponse(content=thumbnail, mimetype='image/'+THUMBNAIL_EXTENSION)
    except IOError as e:
        logger.error(e)
        return HttpResponse()

import os
import json
import logging
import urllib2
import posixpath
import datetime
from StringIO import StringIO
from PIL import Image

from django.utils.translation import ugettext as _
from django.http import HttpResponse
from django.views.decorators.http import condition

from seaserv import get_file_id_by_path, get_repo, seafile_api

from seahub.utils import gen_inner_file_get_url
from seahub.views import check_repo_access_permission
from seahub.settings import THUMBNAIL_DEFAULT_SIZE, THUMBNAIL_EXTENSION, \
    THUMBNAIL_ROOT, ENABLE_THUMBNAIL, THUMBNAIL_IMAGE_SIZE_LIMIT
from seahub.thumbnail.utils import get_thumbnail_src
from seahub.share.models import FileShare

# Get an instance of a logger
logger = logging.getLogger(__name__)

def thumbnail_create(request, repo_id):

    content_type = 'application/json; charset=utf-8'
    result = {}

    if not request.is_ajax():
        err_msg = _(u"Permission denied.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    if not ENABLE_THUMBNAIL:
        err_msg = _(u"Thumbnail function is not enabled.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u"Library does not exist.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    if repo.encrypted:
        err_msg = _(u"Image thumbnail is not supported in encrypted libraries.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    # permission check
    path = request.GET.get('path', None)
    image_path = None
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
        elif check_repo_access_permission(repo_id, request.user) is None:
            err_msg = _(u"Permission denied.")
            return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                                content_type=content_type)

    if not image_path:
        image_path = path

    obj_id = get_file_id_by_path(repo_id, image_path)
    if obj_id is None:
        err_msg = _(u"Wrong path.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    username = request.user.username
    token = seafile_api.get_fileserver_access_token(repo_id, obj_id, 'view',
                                                    username, use_onetime=True)
    inner_url = gen_inner_file_get_url(token, os.path.basename(image_path))
    open_file = urllib2.urlopen(inner_url)
    file_size = int(open_file.info()['Content-Length'])

    # image file size limit check
    if file_size > THUMBNAIL_IMAGE_SIZE_LIMIT * 1024**2:
        err_msg = _(u"Image file is too large.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=520,
                            content_type=content_type)

    size = request.GET.get('size', THUMBNAIL_DEFAULT_SIZE)
    thumbnail_dir = os.path.join(THUMBNAIL_ROOT, size)
    if not os.path.exists(thumbnail_dir):
        os.makedirs(thumbnail_dir)

    thumbnail_file = os.path.join(thumbnail_dir, obj_id)
    if not os.path.exists(thumbnail_file):
        try:
            f = StringIO(open_file.read())
            image = Image.open(f)
            if image.mode not in ["1", "L", "P", "RGB", "RGBA"]:
                image = image.convert("RGB")
            image.thumbnail((int(size), int(size)), Image.ANTIALIAS)
            image.save(thumbnail_file, THUMBNAIL_EXTENSION)
        except Exception as e:
            logger.error(e)
            err_msg = _('Failed to create thumbnail.')
            return HttpResponse(json.dumps({'err_msg': err_msg}), status=500,
                                content_type=content_type)

    result['thumbnail_src'] = get_thumbnail_src(repo_id, obj_id, size)
    return HttpResponse(json.dumps(result), content_type=content_type)

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
    # permission check
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
        elif check_repo_access_permission(repo_id, request.user) is None:
            return HttpResponse()

    thumbnail_file = os.path.join(THUMBNAIL_ROOT, size, obj_id)
    with open(thumbnail_file, 'rb') as f:
        file_content = f.read()

    return HttpResponse(content=file_content, mimetype='image/'+THUMBNAIL_EXTENSION)

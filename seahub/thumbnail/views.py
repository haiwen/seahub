import os
import json
import logging
import urllib2
import mimetypes
import stat
import re
from StringIO import StringIO
from PIL import Image

from django.utils.http import http_date, parse_http_date
from django.utils.translation import ugettext as _
from django.http import CompatibleStreamingHttpResponse, \
        HttpResponse, HttpResponseNotModified

from seaserv import get_file_id_by_path, get_repo, seafile_api

from seahub.views.file import get_file_view_path_and_perm
from seahub.views import check_repo_access_permission
from seahub.settings import THUMBNAIL_DEFAULT_SIZE, THUMBNAIL_EXTENSION, \
    THUMBNAIL_ROOT, ENABLE_THUMBNAIL, THUMBNAIL_IMAGE_SIZE_LIMIT

from seahub.thumbnail.utils import get_thumbnail_src
from seahub.share.models import FileShare
from seahub.utils import gen_file_get_url

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

    path = request.GET.get('path', None)
    obj_id = get_file_id_by_path(repo_id, path)

    if path is None or obj_id is None:
        err_msg = _(u"Wrong path.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    # permission check
    token = request.GET.get('t', None)
    if token:
        fileshare = FileShare.objects.get_valid_file_link_by_token(token)
        if not fileshare or not path.startswith(fileshare.path) or \
            fileshare.repo_id != repo_id:
            # check if is valid download link share token and
            # if is a valid repo/dir belonged to this file share
            err_msg = _(u"Permission denied.")
            return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                                content_type=content_type)
    else:
        if not request.user.is_authenticated():
            err_msg = _(u"Please login first.")
            return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                                content_type=content_type)
        elif check_repo_access_permission(repo_id, request.user) is None:
            err_msg = _(u"Permission denied.")
            return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                                content_type=content_type)

    # get image file from url
    size = request.GET.get('size', THUMBNAIL_DEFAULT_SIZE)
    file_name = os.path.basename(path)
    access_token = seafile_api.get_fileserver_access_token(repo_id,
                                                           obj_id,
                                                           'view',
                                                           request.user.username)
    raw_path = gen_file_get_url(access_token, file_name)
    open_file = urllib2.urlopen(raw_path)
    file_size = int(open_file.info()['Content-Length'])

    # image file size limit check
    if file_size > THUMBNAIL_IMAGE_SIZE_LIMIT * 1024**2:
        err_msg = _(u"Image file is too large.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=520,
                            content_type=content_type)

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
            return HttpResponse(json.dumps({'err_msg': e}), status=500, content_type=content_type)

    result['thumbnail_src'] = get_thumbnail_src(repo_id, obj_id, size)
    return HttpResponse(json.dumps(result), content_type=content_type)

def thumbnail_get(request, repo_id, obj_id, size=THUMBNAIL_DEFAULT_SIZE):

    # permission check
    token = request.GET.get('t', None)
    path = request.GET.get('p', None)
    if token and path:
        fileshare = FileShare.objects.get_valid_file_link_by_token(token)
        if not fileshare or not path.startswith(fileshare.path) or \
            fileshare.repo_id != repo_id:
            # check if is valid download link share token and
            # if is a valid repo/dir belonged to this file share
            return HttpResponse()
    else:
        if not request.user.is_authenticated():
            return HttpResponse()
        elif check_repo_access_permission(repo_id, request.user) is None:
            return HttpResponse()

    fullpath = os.path.join(THUMBNAIL_ROOT, size, obj_id)

    # refer to 'django/views/static.py'
    statobj = os.stat(fullpath)
    mimetype, encoding = mimetypes.guess_type(fullpath)
    mimetype = mimetype or 'application/octet-stream'
    if not was_modified_since(request.META.get('HTTP_IF_MODIFIED_SINCE'),
                              statobj.st_mtime, statobj.st_size):
        return HttpResponseNotModified()
    response = CompatibleStreamingHttpResponse(open(fullpath, 'rb'), content_type=mimetype)
    response["Last-Modified"] = http_date(statobj.st_mtime)
    if stat.S_ISREG(statobj.st_mode):
        response["Content-Length"] = statobj.st_size
    if encoding:
        response["Content-Encoding"] = encoding
    return response

def was_modified_since(header=None, mtime=0, size=0):
    """
    Was something modified since the user last downloaded it?

    header
      This is the value of the If-Modified-Since header.  If this is None,
      I'll just return True.

    mtime
      This is the modification time of the item we're talking about.

    size
      This is the size of the item we're talking about.
    """
    try:
        if header is None:
            raise ValueError
        matches = re.match(r"^([^;]+)(; length=([0-9]+))?$", header,
                           re.IGNORECASE)
        header_mtime = parse_http_date(matches.group(1))
        header_len = matches.group(3)
        if header_len and int(header_len) != size:
            raise ValueError
        if int(mtime) > header_mtime:
            raise ValueError
    except (AttributeError, ValueError, OverflowError):
        return True
    return False

import os
import json
import logging
import urllib2
from StringIO import StringIO
from PIL import Image

from django.utils.translation import ugettext as _
from django.http import HttpResponse, Http404

from seaserv import get_file_id_by_path, get_repo

from seahub.auth.decorators import login_required, login_required_ajax
from seahub.views.file import get_file_view_path_and_perm
from seahub.views import check_repo_access_permission
from seahub.settings import THUMBNAIL_DEFAULT_SIZE, THUMBNAIL_EXTENSION, \
    THUMBNAIL_ROOT, ENABLE_THUMBNAIL

from seahub.thumbnail.utils import get_thumbnail_src

# Get an instance of a logger
logger = logging.getLogger(__name__)

@login_required_ajax
def thumbnail_create(request, repo_id):

    content_type = 'application/json; charset=utf-8'
    result = {}

    path = request.GET.get('path')
    size = request.GET.get('size', THUMBNAIL_DEFAULT_SIZE)
    obj_id = get_file_id_by_path(repo_id, path)
    raw_path, inner_path, user_perm = get_file_view_path_and_perm(request,
                                                                  repo_id,
                                                                  obj_id, path)

    if user_perm is None:
        err_msg = _(u"Permission denied.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    repo = get_repo(repo_id)
    if repo.encrypted:
        err_msg = _(u"Image thumbnail is not supported in encrypted libraries.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    if not ENABLE_THUMBNAIL:
        err_msg = _(u"Thumbnail function is not enabled.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    thumbnail_dir = os.path.join(THUMBNAIL_ROOT, size)
    if not os.path.exists(thumbnail_dir):
        os.makedirs(thumbnail_dir)

    thumbnail_file = os.path.join(thumbnail_dir, obj_id)
    if not os.path.exists(thumbnail_file):
        try:
            f = StringIO(urllib2.urlopen(raw_path).read())
            image = Image.open(f)
            image.thumbnail((int(size), int(size)), Image.ANTIALIAS)
            image.save(thumbnail_file, THUMBNAIL_EXTENSION)
        except Exception as e:
            logger.error(e)
            return HttpResponse(json.dumps({'success': False}), status=500, content_type=content_type)

    result['thumbnail_src'] = get_thumbnail_src(repo_id, obj_id, size)
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required
def thumbnail_get(request, repo_id, obj_id, size=THUMBNAIL_DEFAULT_SIZE):

    permission = check_repo_access_permission(repo_id, request.user)
    if permission is None:
        raise Http404

    thumbnail_file = os.path.join(THUMBNAIL_ROOT, size, obj_id)
    try:
        with open(thumbnail_file, 'rb') as f:
            thumbnail = f.read()
        f.close()
        return HttpResponse(thumbnail, 'image/' + THUMBNAIL_EXTENSION)
    except IOError:
        return HttpResponse()

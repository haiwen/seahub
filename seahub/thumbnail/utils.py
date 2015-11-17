import os
import posixpath
import urllib2
import logging
from StringIO import StringIO
from PIL import Image

from seaserv import get_file_id_by_path, get_repo, get_file_size, \
    seafile_api

from seahub.utils import get_file_type_and_ext, gen_inner_file_get_url
from seahub.utils.file_types import IMAGE

from seahub.settings import ENABLE_THUMBNAIL, THUMBNAIL_EXTENSION, \
    THUMBNAIL_IMAGE_COMPRESSED_SIZE_LIMIT, THUMBNAIL_ROOT

# Get an instance of a logger
logger = logging.getLogger(__name__)

def get_thumbnail_src(repo_id, size, path):
    return posixpath.join("thumbnail", repo_id, str(size), path.lstrip('/'))

def get_share_link_thumbnail_src(token, size, path):
    return posixpath.join("thumbnail", token, str(size), path.lstrip('/'))

def allow_generate_thumbnail(request, repo_id, path):
    """check if thumbnail is allowed
    """

    repo = get_repo(repo_id)
    if not repo:
        return False

    file_id = get_file_id_by_path(repo_id, path)
    if not file_id:
        return False

    obj_name = os.path.basename(path)
    file_type, file_ext = get_file_type_and_ext(obj_name)

    if repo.encrypted or file_type != IMAGE or not ENABLE_THUMBNAIL:
        return False

    # check image size limit
    file_size = get_file_size(repo.store_id, repo.version, file_id)
    if file_size > THUMBNAIL_IMAGE_COMPRESSED_SIZE_LIMIT * 1024**2:
        return False

    return True

def generate_thumbnail(request, repo_id, size, path):
    """ generate and save thumbnail if not exist
    """

    try:
        size = int(size)
    except ValueError as e:
        logger.error(e)
        return False

    repo = get_repo(repo_id)
    if not repo:
        return False

    file_id = get_file_id_by_path(repo_id, path)
    if not file_id:
        return False

    thumbnail_dir = os.path.join(THUMBNAIL_ROOT, str(size))
    if not os.path.exists(thumbnail_dir):
        os.makedirs(thumbnail_dir)

    thumbnail_file = os.path.join(thumbnail_dir, file_id)

    if os.path.exists(thumbnail_file):
        return True

    token = seafile_api.get_fileserver_access_token(repo_id, file_id, 'view',
                                                    '', use_onetime = True)

    inner_path = gen_inner_file_get_url(token, os.path.basename(path))
    try:
        image_file = urllib2.urlopen(inner_path)
        f = StringIO(image_file.read())
        image = Image.open(f)
        if image.mode not in ["1", "L", "P", "RGB", "RGBA"]:
            image = image.convert("RGB")
        image.thumbnail((size, size), Image.ANTIALIAS)
        image.save(thumbnail_file, THUMBNAIL_EXTENSION)
        return True
    except Exception as e:
        logger.error(e)
        return False

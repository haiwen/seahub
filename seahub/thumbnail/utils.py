import os
import posixpath
import urllib2
import logging
from StringIO import StringIO
from PIL import Image

from seaserv import get_file_id_by_path, get_repo, get_file_size, \
    seafile_api

from seahub.utils import gen_inner_file_get_url

from seahub.settings import THUMBNAIL_IMAGE_SIZE_LIMIT, \
    THUMBNAIL_EXTENSION, THUMBNAIL_ROOT, THUMBNAIL_IMAGE_ORIGINAL_SIZE_LIMIT

# Get an instance of a logger
logger = logging.getLogger(__name__)

def get_thumbnail_src(repo_id, size, path):
    return posixpath.join("thumbnail", repo_id, str(size), path.lstrip('/'))

def get_share_link_thumbnail_src(token, size, path):
    return posixpath.join("thumbnail", token, str(size), path.lstrip('/'))

def generate_thumbnail(request, repo_id, size, path):
    """ generate and save thumbnail if not exist

    before generate thumbnail, you should check:
    1. if repo exist: should exist;
    2. if repo is encrypted: not encrypted;
    3. if ENABLE_THUMBNAIL: enabled;
    """

    try:
        size = int(size)
    except ValueError as e:
        logger.error(e)
        return (False, 400)

    thumbnail_dir = os.path.join(THUMBNAIL_ROOT, str(size))
    if not os.path.exists(thumbnail_dir):
        os.makedirs(thumbnail_dir)

    file_id = get_file_id_by_path(repo_id, path)
    if not file_id:
        return (False, 400)

    thumbnail_file = os.path.join(thumbnail_dir, file_id)
    if os.path.exists(thumbnail_file):
        return (True, 200)

    repo = get_repo(repo_id)
    file_size = get_file_size(repo.store_id, repo.version, file_id)
    if file_size > THUMBNAIL_IMAGE_SIZE_LIMIT * 1024**2:
        return (False, 403)

    token = seafile_api.get_fileserver_access_token(repo_id, file_id, 'view',
                                                    '', use_onetime = True)

    inner_path = gen_inner_file_get_url(token, os.path.basename(path))
    try:
        image_file = urllib2.urlopen(inner_path)
        f = StringIO(image_file.read())
        image = Image.open(f)

        # check image memory cost size limit
        # use RGBA as default mode(4x8-bit pixels, true colour with transparency mask)
        # every pixel will cost 4 byte in RGBA mode
        width, height = image.size
        image_memory_cost = width * height * 4 / 1024 / 1024
        if image_memory_cost > THUMBNAIL_IMAGE_ORIGINAL_SIZE_LIMIT:
            return (False, 403)

        if image.mode not in ["1", "L", "P", "RGB", "RGBA"]:
            image = image.convert("RGB")
        image.thumbnail((size, size), Image.ANTIALIAS)
        image.save(thumbnail_file, THUMBNAIL_EXTENSION)
        return (True, 200)
    except Exception as e:
        logger.error(e)
        return (False, 500)

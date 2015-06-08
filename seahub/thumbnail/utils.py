import os
import posixpath
import urllib2
import logging
from StringIO import StringIO
from PIL import Image

from seaserv import get_file_id_by_path, get_repo, get_file_size, \
        seafile_api

from seahub.utils import get_service_url, get_file_type_and_ext, \
    gen_inner_file_get_url
from seahub.utils.file_types import IMAGE

from seahub.settings import ENABLE_THUMBNAIL, THUMBNAIL_EXTENSION, \
    THUMBNAIL_IMAGE_COMPRESSED_SIZE_LIMIT, THUMBNAIL_ROOT, \
    THUMBNAIL_IMAGE_ORIGINAL_SIZE_LIMIT

# Get an instance of a logger
logger = logging.getLogger(__name__)

def get_thumbnail_src(repo_id, obj_id, size):
    return posixpath.join(get_service_url(), "thumbnail", repo_id,
                          obj_id, str(size)) + "/"

def allow_generate_thumbnail(request, repo_id, path):
    """check if thumbnail is allowed
    """

    # get file type
    obj_name = os.path.basename(path)
    file_type, file_ext = get_file_type_and_ext(obj_name)

    # get file size
    file_id = get_file_id_by_path(repo_id, path.encode('utf-8'))
    repo = get_repo(repo_id)
    file_size = get_file_size(repo.store_id, repo.version, file_id)

    if not repo.encrypted and file_type == IMAGE and ENABLE_THUMBNAIL:
        # check image compressed size limit
        if file_size < THUMBNAIL_IMAGE_COMPRESSED_SIZE_LIMIT * 1024**2:
            return True

        # get image memory cost
        obj_id = get_file_id_by_path(repo_id, path)
        token = seafile_api.get_fileserver_access_token(repo_id, obj_id, 'view',
                                                        request.user.username,
                                                        use_onetime = False)
        inner_path = gen_inner_file_get_url(token, obj_name)
        try:
            image_file = urllib2.urlopen(inner_path)
            f = StringIO(image_file.read())
            image = Image.open(f)
            width, height = image.size

            # check image memory cost size limit
            # use RGBA as default mode(4x8-bit pixels, true colour with transparency mask)
            # every pixel will cost 4 byte in RGBA mode
            image_memory_cost = width * height * 4 / 1024 / 1024
            if image_memory_cost < THUMBNAIL_IMAGE_ORIGINAL_SIZE_LIMIT:
                return True
        except Exception as e:
            logger.error(e)
            return False

    return False

def generate_thumbnail(request, repo_id, path, size):
    """
    generate and save thumbnail if not exist
    return thumbnail's src if success
    """

    thumbnail_dir = os.path.join(THUMBNAIL_ROOT, str(size))
    if not os.path.exists(thumbnail_dir):
        os.makedirs(thumbnail_dir)

    obj_id = get_file_id_by_path(repo_id, path)
    thumbnail_file = os.path.join(thumbnail_dir, obj_id)

    if not os.path.exists(thumbnail_file):
        obj_id = get_file_id_by_path(repo_id, path)
        token = seafile_api.get_fileserver_access_token(repo_id, obj_id, 'view',
                                                        request.user.username,
                                                        use_onetime = False)
        inner_path = gen_inner_file_get_url(token, os.path.basename(path))
        try:
            image_file = urllib2.urlopen(inner_path)
            f = StringIO(image_file.read())
            image = Image.open(f)
            if image.mode not in ["1", "L", "P", "RGB", "RGBA"]:
                image = image.convert("RGB")
            image.thumbnail((size, size), Image.ANTIALIAS)
            image.save(thumbnail_file, THUMBNAIL_EXTENSION)
        except Exception as e:
            logger.error(e)
            return None

    return get_thumbnail_src(repo_id, obj_id, str(size))

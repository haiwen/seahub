# Copyright (c) 2012-2016 Seafile Ltd.
import os
import posixpath
import timeit
import tempfile
import urllib.request, urllib.error, urllib.parse
import logging
import subprocess
from io import BytesIO
import zipfile
try: # Py2 and Py3 compatibility
    from urllib.request import urlretrieve
except:
    from urllib.request import urlretrieve

from PIL import Image
from seaserv import get_file_id_by_path, get_repo, get_file_size, \
    seafile_api

from seahub.utils import gen_inner_file_get_url, get_file_type_and_ext
from seahub.utils.file_types import VIDEO, XMIND
from seahub.settings import THUMBNAIL_IMAGE_SIZE_LIMIT, \
    THUMBNAIL_EXTENSION, THUMBNAIL_ROOT, THUMBNAIL_IMAGE_ORIGINAL_SIZE_LIMIT,\
    ENABLE_VIDEO_THUMBNAIL, THUMBNAIL_VIDEO_FRAME_TIME
# Get an instance of a logger
logger = logging.getLogger(__name__)

XMIND_IMAGE_SIZE = 1024

def get_thumbnail_src(repo_id, size, path):
    return posixpath.join("thumbnail", repo_id, str(size), path.lstrip('/'))

def get_share_link_thumbnail_src(token, size, path):
    return posixpath.join("thumbnail", token, str(size), path.lstrip('/'))

def get_rotated_image(image):

    # get image's exif info
    try:
        exif = image._getexif() if image._getexif() else {}
    except Exception:
        return image

    orientation = exif.get(0x0112) if isinstance(exif, dict) else 1
    # rotate image according to Orientation info

    # im.transpose(method)
    # Returns a flipped or rotated copy of an image.
    # Method can be one of the following: FLIP_LEFT_RIGHT, FLIP_TOP_BOTTOM, ROTATE_90, ROTATE_180, or ROTATE_270.

    # expand: Optional expansion flag.
    # If true, expands the output image to make it large enough to hold the entire rotated image.
    # If false or omitted, make the output image the same size as the input image.

    if orientation == 2:
        # Vertical image
        image = image.transpose(Image.FLIP_LEFT_RIGHT)
    elif orientation == 3:
        # Rotation 180
        image = image.rotate(180)
    elif orientation == 4:
        image = image.rotate(180).transpose(Image.FLIP_LEFT_RIGHT)
        # Horizontal image
    elif orientation == 5:
        # Horizontal image + Rotation 90 CCW
        image = image.rotate(-90, expand=True).transpose(Image.FLIP_LEFT_RIGHT)
    elif orientation == 6:
        # Rotation 270
        image = image.rotate(-90, expand=True)
    elif orientation == 7:
        # Horizontal image + Rotation 270
        image = image.rotate(90, expand=True).transpose(Image.FLIP_LEFT_RIGHT)
    elif orientation == 8:
        # Rotation 90
        image = image.rotate(90, expand=True)

    return image

def generate_thumbnail(request, repo_id, size, path):
    """ generate and save thumbnail if not exist

    before generate thumbnail, you should check:
    1. if repo exist: should exist;
    2. if repo is encrypted: not encrypted;
    """

    try:
        size = int(size)
    except ValueError as e:
        logger.error(e)
        return (False, 400)

    thumbnail_dir = os.path.join(THUMBNAIL_ROOT, str(size))
    if not os.path.exists(thumbnail_dir):
        os.makedirs(thumbnail_dir)

    filetype, fileext = get_file_type_and_ext(os.path.basename(path))

    if filetype == VIDEO and not ENABLE_VIDEO_THUMBNAIL:
        return (False, 400)

    file_id = get_file_id_by_path(repo_id, path)
    if not file_id:
        return (False, 400)

    thumbnail_file = os.path.join(thumbnail_dir, file_id)
    if os.path.exists(thumbnail_file):
        return (True, 200)

    repo = get_repo(repo_id)
    file_size = get_file_size(repo.store_id, repo.version, file_id)

    if filetype == VIDEO:
        # video thumbnails
        if ENABLE_VIDEO_THUMBNAIL:
            return create_video_thumbnails(repo, file_id, path, size,
                                           thumbnail_file, file_size)
        else:
            return (False, 400)

    if filetype == XMIND:
        return extract_xmind_image(repo_id, path, size)

    # image thumbnails
    if file_size > THUMBNAIL_IMAGE_SIZE_LIMIT * 1024**2:
        return (False, 400)

    if fileext.lower() == 'psd':
        return create_psd_thumbnails(repo, file_id, path, size,
                                           thumbnail_file, file_size)

    token = seafile_api.get_fileserver_access_token(repo_id,
            file_id, 'view', '', use_onetime=True)

    if not token:
        return (False, 500)

    inner_path = gen_inner_file_get_url(token, os.path.basename(path))
    try:
        image_file = urllib.request.urlopen(inner_path)
        f = BytesIO(image_file.read())
        return _create_thumbnail_common(f, thumbnail_file, size)
    except Exception as e:
        logger.warning(e)
        return (False, 400)

def create_psd_thumbnails(repo, file_id, path, size, thumbnail_file, file_size):
    try:
        from psd_tools import PSDImage
    except ImportError:
        logger.error("Could not find psd_tools installed. "
                     "Please install by 'pip install psd_tools'")
        return (False, 500)

    token = seafile_api.get_fileserver_access_token(
        repo.id, file_id, 'view', '', use_onetime=False)
    if not token:
        return (False, 500)

    tmp_img_path = str(os.path.join(tempfile.gettempdir(), '%s.png' % file_id))
    t1 = timeit.default_timer()

    inner_path = gen_inner_file_get_url(token, os.path.basename(path))
    tmp_file = os.path.join(tempfile.gettempdir(), file_id)
    urlretrieve(inner_path, tmp_file)
    psd = PSDImage.open(tmp_file)

    merged_image = psd.topil()
    merged_image.save(tmp_img_path)
    os.unlink(tmp_file)     # remove origin psd file

    t2 = timeit.default_timer()
    logger.debug('Extract psd image [%s](size: %s) takes: %s' % (path, file_size, (t2 - t1)))

    try:
        ret = _create_thumbnail_common(tmp_img_path, thumbnail_file, size)
        os.unlink(tmp_img_path)
        return ret
    except Exception as e:
        logger.error(e)
        os.unlink(tmp_img_path)
        return (False, 500)

def create_video_thumbnails(repo, file_id, path, size, thumbnail_file, file_size):

    t1 = timeit.default_timer()
    token = seafile_api.get_fileserver_access_token(repo.id,
            file_id, 'view', '', use_onetime=False)

    if not token:
        return (False, 500)

    inner_path = gen_inner_file_get_url(token, os.path.basename(path))
    tmp_path = str(os.path.join(tempfile.gettempdir(), '%s.png' % file_id[:8]))

    try:
        subprocess.check_output(['ffmpeg', '-ss', str(THUMBNAIL_VIDEO_FRAME_TIME), '-vframes', '1', tmp_path, '-i', inner_path])
    except Exception as e:
        logger.error(e)
        return (False, 500)
    
    t2 = timeit.default_timer()
    logger.debug('Create thumbnail of [%s](size: %s) takes: %s' % (path, file_size, (t2 - t1)))

    try:
        ret = _create_thumbnail_common(tmp_path, thumbnail_file, size)
        os.unlink(tmp_path)
        return ret
    except Exception as e:
        logger.error(e)
        os.unlink(tmp_path)
        return (False, 500)

def _create_thumbnail_common(fp, thumbnail_file, size):
    """Common logic for creating image thumbnail.

    `fp` can be a filename (string) or a file object.
    """
    image = Image.open(fp)

    # check image memory cost size limit
    # use RGBA as default mode(4x8-bit pixels, true colour with transparency mask)
    # every pixel will cost 4 byte in RGBA mode
    width, height = image.size
    image_memory_cost = width * height * 4 / 1024 / 1024
    if image_memory_cost > THUMBNAIL_IMAGE_ORIGINAL_SIZE_LIMIT:
        return (False, 403)

    if image.mode not in ["1", "L", "P", "RGB", "RGBA"]:
        image = image.convert("RGB")

    image = get_rotated_image(image)
    image.thumbnail((size, size), Image.ANTIALIAS)
    image.save(thumbnail_file, THUMBNAIL_EXTENSION)
    return (True, 200)

def extract_xmind_image(repo_id, path, size=XMIND_IMAGE_SIZE):

    # get inner path
    file_name = os.path.basename(path)
    file_id = seafile_api.get_file_id_by_path(repo_id, path)
    fileserver_token = seafile_api.get_fileserver_access_token(repo_id,
            file_id, 'view', '')
    inner_path = gen_inner_file_get_url(fileserver_token, file_name)

    # extract xmind image
    xmind_file = urllib.request.urlopen(inner_path)
    xmind_file_str = BytesIO(xmind_file.read())
    xmind_zip_file = zipfile.ZipFile(xmind_file_str, 'r')
    extracted_xmind_image = xmind_zip_file.read('Thumbnails/thumbnail.png')
    extracted_xmind_image_str = BytesIO(extracted_xmind_image)

    # save origin xmind image to thumbnail folder
    thumbnail_dir = os.path.join(THUMBNAIL_ROOT, str(size))
    if not os.path.exists(thumbnail_dir):
        os.makedirs(thumbnail_dir)
    local_xmind_image = os.path.join(thumbnail_dir, file_id)

    try:
        ret = _create_thumbnail_common(extracted_xmind_image_str, local_xmind_image, size)
        return ret
    except Exception as e:
        logger.error(e)
        return (False, 500)

def get_thumbnail_image_path(obj_id, image_size):
    thumbnail_dir = os.path.join(THUMBNAIL_ROOT, str(image_size))
    thumbnail_image_path = os.path.join(thumbnail_dir, obj_id)
    return thumbnail_image_path

# Copyright (c) 2012-2016 Seafile Ltd.
import os
import posixpath
import timeit
import tempfile
import urllib.request, urllib.error, urllib.parse
import logging
import subprocess
from io import BytesIO

try: # Py2 and Py3 compatibility
    from urllib.request import urlretrieve
except:
    from urllib.request import urlretrieve

from PIL import Image

from seaserv import get_file_id_by_path, get_repo, get_file_size, \
    seafile_api

from seahub.utils import gen_inner_file_get_url, get_file_type_and_ext, normalize_file_path
from seahub.utils.file_types import VIDEO, PDF, SVG, SEADOC
from seahub.settings import THUMBNAIL_IMAGE_SIZE_LIMIT, \
    THUMBNAIL_EXTENSION, THUMBNAIL_ROOT, THUMBNAIL_IMAGE_ORIGINAL_SIZE_LIMIT,\
    ENABLE_VIDEO_THUMBNAIL, THUMBNAIL_VIDEO_FRAME_TIME, SERVICE_URL
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

# Get an instance of a logger
logger = logging.getLogger(__name__)

MAX_PAGE_AREA = 8000000  # 8 million square points
# If the page size is large but does not exceed the limit, reduce DPI
LARGE_WIDTH_HEIGHT_THRESHOLD = 2000
LARGE_AREA_THRESHOLD = 3000000
# PDF size threshold for detailed page size checking (bytes)
LARGE_PDF_SIZE_THRESHOLD = 50 * 1024 * 1024  # 50MB

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
        image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    elif orientation == 3:
        # Rotation 180
        image = image.rotate(180)
    elif orientation == 4:
        image = image.rotate(180).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        # Horizontal image
    elif orientation == 5:
        # Horizontal image + Rotation 90 CCW
        image = image.rotate(-90, expand=True).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    elif orientation == 6:
        # Rotation 270
        image = image.rotate(-90, expand=True)
    elif orientation == 7:
        # Horizontal image + Rotation 270
        image = image.rotate(90, expand=True).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
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

    if filetype == VIDEO:
        return (False, 400) # video thumbnails not supported in seahub

    file_id = get_file_id_by_path(repo_id, path)
    if not file_id:
        return (False, 400)

    thumbnail_file = os.path.join(thumbnail_dir, file_id)
    if os.path.exists(thumbnail_file):
        return (True, 200)

    repo = get_repo(repo_id)
    file_size = get_file_size(repo.store_id, repo.version, file_id)

    if filetype == PDF:
        # pdf thumbnails
        return create_pdf_thumbnails(repo, file_id, path, size,
                                     thumbnail_file, file_size)


    # image thumbnails
    if file_size > THUMBNAIL_IMAGE_SIZE_LIMIT * 1024**2:
        return (False, 400)

    if fileext.lower() == 'psd':
        return create_psd_thumbnails(repo, file_id, path, size,
                                           thumbnail_file, file_size)
    
    if filetype == SVG:
        return create_svg_thumbnails(repo, file_id, path, size, thumbnail_file, file_size)
    
    if filetype == SEADOC:
        return (False, 400)

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

def pdf_bytes_to_images(pdf_bytes, prefix_path, dpi=150):
    with tempfile.NamedTemporaryFile(delete=True, suffix='.pdf') as tmpfile:
        tmpfile.write(pdf_bytes)
        tmp_file = tmpfile.name
        
        if len(pdf_bytes) > LARGE_PDF_SIZE_THRESHOLD:
            pdf_info_command = [
                'pdfinfo',
                '-f', '1',
                '-l', '1',
                tmp_file
            ]
            try:
                page_info = subprocess.check_output(pdf_info_command, stderr=subprocess.PIPE).decode('utf-8')
                
                page_size = None
                for line in page_info.split('\n'):
                    if 'Page    1 size:' in line:
                        page_size = line.strip()
                        break
                # check page size
                if page_size:
                    # format: "Page    1 size:  6000 x 6000 pts"
                    parts = page_size.split(':', 1)[1].strip().split('x')
                    if len(parts) >= 2:
                        width = float(parts[0].strip())
                        height = float(parts[1].split('pts')[0].strip())
                        area = width * height
                        if area > MAX_PAGE_AREA:
                            raise Exception(f'PDF page area too large: {area:.0f} sq pts (limit: {MAX_PAGE_AREA})')

                        if (width > LARGE_WIDTH_HEIGHT_THRESHOLD or height > LARGE_WIDTH_HEIGHT_THRESHOLD or 
                            area > LARGE_AREA_THRESHOLD):
                            dpi = 72  # use min dpi
                            logger.info(f'Large PDF page detected ({width}x{height}), reducing DPI to {dpi}')
                            
            except Exception as e:
                # If it is clear that the page was skipped due to being too large, throw the exception again 
                if 'PDF page too large' in str(e) or 'PDF page area too large' in str(e):
                    logger.error(f'PDF thumbnail generation failed: {e}')
                    return (False, 400)
                dpi = 72
        
        command = [
            'pdftoppm',
            '-png',
            '-r', str(dpi),
            '-f', '1',
            '-l', '1',
            '-scale-to', '1024',
            '-singlefile', tmp_file,
            '-o', prefix_path
        ]
        try:
            subprocess.check_output(command, timeout=60)
        except subprocess.TimeoutExpired:
            logger.error('PDF thumbnail generation timed out after 60 seconds')
            return (False, 500)
        except subprocess.CalledProcessError as e:
            logger.error(f'pdftoppm failed: {e}')
            return (False, 500)

def create_pdf_thumbnails(repo, file_id, path, size, thumbnail_file, file_size):
    t1 = timeit.default_timer()
    token = seafile_api.get_fileserver_access_token(repo.id,
            file_id, 'view', '', use_onetime=False)

    if not token:
        return (False, 500)

    inner_path = gen_inner_file_get_url(token, os.path.basename(path))
    tmp_path = str(os.path.join(tempfile.gettempdir(), '%s' % file_id[:8]))
    pdf_file = urllib.request.urlopen(inner_path)
    try:
        pdf_bytes_to_images(pdf_file.read(), tmp_path)
        tmp_path = tmp_path + '.png'
    except Exception as e:
        logger.error(e)
        return (False, 500)
    t2 = timeit.default_timer()
    logger.debug('Create PDF thumbnail of [%s](size: %s) takes: %s' % (path, file_size, (t2 - t1)))
    try:
        ret = _create_thumbnail_common(tmp_path, thumbnail_file, size)
        os.unlink(tmp_path)
        return ret
    except Exception as e:
        logger.error(e)
        os.unlink(tmp_path)
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
        subprocess.check_output(['ffmpeg', '-ss', str(THUMBNAIL_VIDEO_FRAME_TIME), '-vframes', '1', tmp_path, '-i', inner_path, '-nostdin'])
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
    
    
def create_svg_thumbnails(repo, file_id, path, size, thumbnail_file, file_size):
    try:
        import cairosvg
    except ImportError:
        logger.error("Could not find cairosvg installed. "
                     "Please install by 'pip install cairosvg' (requires system cairo library)")
        return (False, 500)

    token = seafile_api.get_fileserver_access_token(
        repo.id, file_id, 'view', '', use_onetime=False
    )
    if not token:
        logger.error(f"Failed to get access token for SVG file {file_id}")
        return (False, 500)

    inner_path = gen_inner_file_get_url(token, os.path.basename(path))
    tmp_png_path = os.path.join(tempfile.gettempdir(), f"{file_id}.png")

    try:
        svg_file = urllib.request.urlopen(inner_path)
        svg_file_content = svg_file.read()
        t1 = timeit.default_timer()
        cairosvg.svg2png(
            bytestring=svg_file_content,
            write_to=tmp_png_path,
            dpi=200,
            output_width=size,
            output_height=size
        )

        t2 = timeit.default_timer()
        logger.debug(f"Convert SVG [{path}] to PNG takes: {t2 - t1:.2f}s")

        ret = _create_thumbnail_common(tmp_png_path, thumbnail_file, size)
        os.unlink(tmp_png_path)
        return ret

    except Exception as e:
        logger.error(f"Failed to generate SVG thumbnail for {path}: {str(e)}")
        os.unlink(tmp_png_path)
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
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    save_type = THUMBNAIL_EXTENSION
    if image.mode in ['RGBA', 'P']:
        save_type = 'png'
    icc_profile = image.info.get('icc_profile')
    image.save(thumbnail_file, save_type, icc_profile=icc_profile)
    return (True, 200)

def get_thumbnail_image_path(obj_id, image_size):
    thumbnail_dir = os.path.join(THUMBNAIL_ROOT, str(image_size))
    thumbnail_image_path = os.path.join(thumbnail_dir, obj_id)
    return thumbnail_image_path

def remove_thumbnail_by_id(file_id):
    for size_dir in [item for item in os.listdir(THUMBNAIL_ROOT) if os.path.isdir(os.path.join(THUMBNAIL_ROOT, item))]:
        if os.path.exists(os.path.join(THUMBNAIL_ROOT, size_dir, file_id)):
            os.remove(os.path.join(THUMBNAIL_ROOT, size_dir, file_id))

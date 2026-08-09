# Copyright (c) 2012-2016 Seafile Ltd.
import hashlib
import os
import posixpath
import timeit
import tempfile
import urllib.request, urllib.error, urllib.parse
import logging
import subprocess
import struct
import zipfile
from io import BytesIO
from xml.etree import ElementTree

try: # Py2 and Py3 compatibility
    from urllib.request import urlretrieve
except:
    from urllib.request import urlretrieve

from PIL import Image

from seaserv import get_file_id_by_path, get_repo, get_file_size, \
    seafile_api

from seahub.utils import gen_inner_file_get_url, get_file_type_and_ext, normalize_file_path
from seahub.utils.file_types import VIDEO, PDF, SVG, SEADOC, EPUB
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
EPUB_METADATA_SIZE_LIMIT = 1024 * 1024
EPUB_COVER_SIZE_LIMIT = 20 * 1024 * 1024
EPUB_ARCHIVE_SIZE_LIMIT = 50 * 1024 * 1024
EPUB_MAX_ENTRIES = 10000


def _check_epub_entry_count(epub_file):
    epub_file.seek(0, os.SEEK_END)
    file_size = epub_file.tell()
    footer_start = max(0, file_size - 65557)
    epub_file.seek(footer_start)
    footer = epub_file.read()
    eocd_offset = footer.rfind(b'PK\x05\x06')
    if eocd_offset < 0 or len(footer) - eocd_offset < 22:
        raise ValueError('Invalid EPUB central directory')
    entry_count = struct.unpack_from('<H', footer, eocd_offset + 10)[0]
    if entry_count == 0xffff:
        raise ValueError('ZIP64 EPUB archives are unsupported')
    if entry_count > EPUB_MAX_ENTRIES:
        raise ValueError('EPUB has too many entries')

    central_directory_size, central_directory_offset = struct.unpack_from(
        '<II', footer, eocd_offset + 12)
    absolute_eocd_offset = footer_start + eocd_offset
    if central_directory_offset + central_directory_size != absolute_eocd_offset:
        raise ValueError('Invalid EPUB central directory')

    epub_file.seek(central_directory_offset)
    directory = epub_file.read(central_directory_size)
    offset = 0
    actual_entry_count = 0
    while offset < len(directory):
        if directory[offset:offset + 4] != b'PK\x01\x02' or offset + 46 > len(directory):
            raise ValueError('Invalid EPUB central directory')
        name_size, extra_size, comment_size = struct.unpack_from(
            '<HHH', directory, offset + 28)
        offset += 46 + name_size + extra_size + comment_size
        actual_entry_count += 1
        if actual_entry_count > EPUB_MAX_ENTRIES:
            raise ValueError('EPUB has too many entries')
    if offset != len(directory) or actual_entry_count != entry_count:
        raise ValueError('Invalid EPUB central directory')
    epub_file.seek(0)


def _read_epub_member(archive, path, size_limit):
    try:
        member = archive.getinfo(path)
    except KeyError as e:
        raise ValueError('EPUB member not found') from e
    if member.file_size > size_limit:
        raise ValueError('EPUB member is too large')
    with archive.open(member) as source:
        data = source.read(size_limit + 1)
    if len(data) > size_limit:
        raise ValueError('EPUB member is too large')
    return data


def _copy_epub(response, destination):
    copied = 0
    while True:
        chunk = response.read(64 * 1024)
        if not chunk:
            return
        copied += len(chunk)
        if copied > EPUB_ARCHIVE_SIZE_LIMIT:
            raise ValueError('EPUB archive is too large')
        destination.write(chunk)


def get_epub_cover(epub_file):
    """Return the cover image from an EPUB 2 or EPUB 3 archive."""
    _check_epub_entry_count(epub_file)
    with zipfile.ZipFile(epub_file) as archive:
        if len(archive.infolist()) > EPUB_MAX_ENTRIES:
            raise ValueError('EPUB has too many entries')
        container_data = _read_epub_member(
            archive, 'META-INF/container.xml', EPUB_METADATA_SIZE_LIMIT)
        container = ElementTree.fromstring(container_data)
        rootfile = next((element for element in container.iter()
                         if element.tag.rsplit('}', 1)[-1] == 'rootfile'), None)
        package_path = rootfile.get('full-path') if rootfile is not None else None
        if not package_path:
            raise ValueError('EPUB package document not found')

        package_path = posixpath.normpath(package_path)
        if package_path.startswith('../') or package_path.startswith('/'):
            raise ValueError('Invalid EPUB package path')
        package = ElementTree.fromstring(_read_epub_member(
            archive, package_path, EPUB_METADATA_SIZE_LIMIT))

        cover_id = None
        manifest_items = []
        for element in package.iter():
            tag = element.tag.rsplit('}', 1)[-1]
            if tag == 'meta' and element.get('name') == 'cover':
                cover_id = element.get('content')
            elif tag == 'item':
                manifest_items.append(element)

        cover_item = next((item for item in manifest_items
                           if 'cover-image' in item.get('properties', '').split()), None)
        if cover_item is None and cover_id:
            cover_item = next((item for item in manifest_items
                               if item.get('id') == cover_id), None)
        if cover_item is None or not cover_item.get('href'):
            raise ValueError('EPUB cover not found')

        package_dir = posixpath.dirname(package_path)
        cover_href = urllib.parse.urlsplit(cover_item.get('href')).path
        cover_path = posixpath.normpath(posixpath.join(
            package_dir, urllib.parse.unquote(cover_href)))
        if cover_path.startswith('../') or cover_path.startswith('/'):
            raise ValueError('Invalid EPUB cover path')

        return BytesIO(_read_epub_member(
            archive, cover_path, EPUB_COVER_SIZE_LIMIT))

def generate_thumbnail_key(repo_id, path):
    """Generate thumbnail key using MD5(repo_id + path)."""
    path = normalize_file_path(path)
    hash_key = hashlib.md5((repo_id + path).encode('utf-8')).hexdigest()
    return "md5_%s" % hash_key

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

    # Use MD5 of repo_id + path as thumbnail filename
    thumbnail_key = generate_thumbnail_key(repo_id, path)
    thumbnail_file = os.path.join(thumbnail_dir, thumbnail_key)
    
    file_obj = seafile_api.get_dirent_by_path(repo_id, path)
    source_mtime = file_obj.mtime if file_obj else 0

    
    if os.path.exists(thumbnail_file):
        thumbnail_mtime = os.path.getmtime(thumbnail_file)
        if thumbnail_mtime >= source_mtime:
            return (True, 200)
        try:
            os.unlink(thumbnail_file)
        except OSError:
            pass
    repo = get_repo(repo_id)
    file_size = get_file_size(repo.store_id, repo.version, file_id)

    if filetype == PDF:
        # pdf thumbnails
        return create_pdf_thumbnails(repo, file_id, path, size,
                                     thumbnail_file, file_size)

    if filetype == EPUB:
        if file_size > EPUB_ARCHIVE_SIZE_LIMIT:
            return (False, 400)
        return create_epub_thumbnail(repo, file_id, path, size, thumbnail_file)


    # image thumbnails
    if file_size > THUMBNAIL_IMAGE_SIZE_LIMIT * 1024**2:
        return (False, 400)

    if fileext.lower() in ('psd', 'psb'):
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


def create_epub_thumbnail(repo, file_id, path, size, thumbnail_file):
    token = seafile_api.get_fileserver_access_token(
        repo.id, file_id, 'view', '', use_onetime=True)
    if not token:
        return (False, 500)

    try:
        inner_path = gen_inner_file_get_url(token, os.path.basename(path))
        with urllib.request.urlopen(inner_path) as response:
            with tempfile.SpooledTemporaryFile(max_size=2 * 1024 * 1024) as epub_file:
                _copy_epub(response, epub_file)
                epub_file.seek(0)
                cover = get_epub_cover(epub_file)
                return _create_thumbnail_common(cover, thumbnail_file, size)
    except Exception as e:
        logger.warning('Failed to create EPUB cover thumbnail for %s: %s', path, e)
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

def get_thumbnail_image_path(repo_id, path, image_size):
    """Get thumbnail image path using MD5(repo_id + path) as filename."""
    thumbnail_dir = os.path.join(THUMBNAIL_ROOT, str(image_size))
    thumbnail_key = generate_thumbnail_key(repo_id, path)
    thumbnail_image_path = os.path.join(thumbnail_dir, thumbnail_key)
    return thumbnail_image_path

def remove_thumbnail_by_path(repo_id, path):
    """Remove thumbnail files for a given repo_id + path."""
    thumbnail_key = generate_thumbnail_key(repo_id, path)
    for size_dir in [item for item in os.listdir(THUMBNAIL_ROOT) if os.path.isdir(os.path.join(THUMBNAIL_ROOT, item))]:
        thumbnail_file = os.path.join(THUMBNAIL_ROOT, size_dir, thumbnail_key)
        if os.path.exists(thumbnail_file):
            os.remove(thumbnail_file)

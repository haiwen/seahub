import os
import re
import logging

from django.http import HttpResponse, JsonResponse

from seaserv import seafile_api

from seahub.auth.decorators import login_required
from seahub.utils import normalize_file_path
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)


def _read_file_content(repo_id, file_id):
    """Read file content via seafobj."""
    from seafobj import fs_mgr
    f = fs_mgr.load_seafile(repo_id, 1, file_id)
    return f.get_content()


def _parse_xmp_metadata(file_content):
    """Extract XMP metadata values from raw file bytes.

    Searches all XMP blocks in the file since HEIC live photos may have
    multiple XMP blocks with GCamera tags in a later block.

    Returns a dict with parsed XMP values:
      - MotionPhoto (int)
      - MicroVideo (int)
      - MicroVideoOffset (int)
    """
    result = {'MotionPhoto': 0, 'MicroVideo': 0, 'MicroVideoOffset': 0}

    xmp_start_tag = b'<x:xmpmeta'
    xmp_end_tag = b'</x:xmpmeta>'
    search_pos = 0

    while True:
        xmp_start = file_content.find(xmp_start_tag, search_pos)
        if xmp_start == -1:
            break
        xmp_end = file_content.find(xmp_end_tag, xmp_start)
        if xmp_end == -1:
            break

        xmp_data = file_content[xmp_start:xmp_end + len(xmp_end_tag)].decode('utf-8', errors='ignore')
        search_pos = xmp_end + len(xmp_end_tag)

        if 'GCamera' not in xmp_data:
            continue

        # parse key XMP tags — support both attribute and element formats
        tags = ['MotionPhoto', 'MicroVideo', 'MicroVideoOffset']
        for tag in tags:
            match = re.search(r'GCamera:%s="(\d+)"' % tag, xmp_data)
            if not match:
                match = re.search(r'<GCamera:%s>(\d+)</GCamera:%s>' % (tag, tag), xmp_data)
            if match:
                result[tag] = int(match.group(1))
        break  # found the GCamera XMP block, no need to continue

    return result


def _check_is_live_photo(repo_id, file_id):
    """Check if a HEIC file is a live photo by checking XMP metadata.

    Returns True if the file has MotionPhoto=1 or MicroVideo=1.
    """
    try:
        file_content = _read_file_content(repo_id, file_id)
    except Exception as e:
        logger.error('read file content via seafobj error: %s', e)
        return False

    try:
        xmp = _parse_xmp_metadata(file_content)
        if xmp['MotionPhoto'] == 1 or xmp['MicroVideo'] == 1:
            return True
            
        # fallback: check for Apple Live Photo markers or generic MotionPhoto/MicroVideo strings
        markers = [b'quicktime.live-photo', b'LivePhotoMetadata', b'MotionPhotoVideo']
        for marker in markers:
            if marker in file_content:
                return True
                
        return False
    except Exception as e:
        logger.error('check live photo error: %s', e)
        return False


def _extract_video_data(file_content):
    """Extract embedded video data from a live photo file.

    Tries two strategies:
    1. Use MicroVideoOffset from XMP metadata (offset from end of file)
    2. Search for MP4 ftyp box signature as fallback (skip HEIC's own ftyp)
    """
    xmp = _parse_xmp_metadata(file_content)

    # strategy 1: use MicroVideoOffset from XMP
    offset = xmp.get('MicroVideoOffset', 0)
    if offset > 0 and offset < len(file_content):
        return file_content[len(file_content) - offset:]

    # strategy 2: search for MP4 ftyp box after XMP block
    # skip HEIC file's own ftyp header at the beginning
    xmp_end = file_content.find(b'</x:xmpmeta>')
    search_start = xmp_end if xmp_end != -1 else 1024
    idx = file_content.find(b'ftyp', search_start)
    if idx >= 4:
        video_start = idx - 4
        return file_content[video_start:]

    return None


@login_required
def check_live_photo(request, repo_id, path):
    """Check if a HEIC file is a live photo.

    GET /api/v2.1/repos/:repo_id/:path/check-live-photo
    """
    # resource check
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        return HttpResponse('Library not found.', status=404)

    path = normalize_file_path(path)
    file_id = seafile_api.get_file_id_by_path(repo_id, path)
    if not file_id:
        return HttpResponse('File not found.', status=404)

    # check file extension
    filename = os.path.basename(path)
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext != '.heic':
        return JsonResponse({'is_live_photo': False})

    # permission check
    parent_dir = os.path.dirname(path)
    permission = check_folder_permission(request, repo_id, parent_dir)
    if not permission:
        return HttpResponse('Permission denied.', status=403)

    is_live = _check_is_live_photo(repo_id, file_id)
    return JsonResponse({'is_live_photo': is_live})


@login_required
def live_photo_content(request, repo_id, path):
    """Return live photo video content as binary stream.

    URL: GET /repo/:repo_id/live-photo/:path/content
    """
    # resource check
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        return HttpResponse('Library not found.', status=404)

    path = normalize_file_path(path)
    file_id = seafile_api.get_file_id_by_path(repo_id, path)
    if not file_id:
        return HttpResponse('File not found.', status=404)

    # check file extension
    filename = os.path.basename(path)
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext != '.heic':
        return HttpResponse('Not a HEIC file.', status=400)

    # permission check
    parent_dir = os.path.dirname(path)
    permission = check_folder_permission(request, repo_id, parent_dir)
    if not permission:
        return HttpResponse('Permission denied.', status=403)

    # read file content via seafobj
    try:
        file_content = _read_file_content(repo_id, file_id)
    except Exception as e:
        logger.error('read file content via seafobj error: %s', e)
        return HttpResponse('Internal Server Error', status=500)

    # extract video data
    try:
        video_data = _extract_video_data(file_content)
        if not video_data:
            return HttpResponse('Not a live photo or no video data found.', status=404)
    except Exception as e:
        logger.error('extract live photo video error: %s', e)
        return HttpResponse('Internal Server Error', status=500)

    resp = HttpResponse(video_data, content_type='video/mp4')
    resp['Content-Disposition'] = 'inline; filename=livephoto.mov'
    resp['Accept-Ranges'] = 'bytes'
    return resp

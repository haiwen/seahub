import os
import logging
import tempfile
import subprocess

import exiftool
import requests
from django.http import HttpResponse, JsonResponse

from seaserv import seafile_api

from seahub.auth.decorators import login_required
from seahub.utils import normalize_file_path, gen_inner_file_get_url
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)

def _get_metadata_value(metadata, key, default=None):
    value = metadata.get(key, default)
    if isinstance(value, list):
        return value[0] if value else default
    return value

def _is_truthy_flag(value):
    try:
        return int(str(value).strip()) == 1
    except (TypeError, ValueError):
        return False

def _get_int_value(value, default=0):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default


def _get_file_content(repo_id, file_id, filename, username):
    token = seafile_api.get_fileserver_access_token(
        repo_id, file_id, 'view', username, use_onetime=False
    )
    if not token:
        raise RuntimeError('failed to get fileserver access token')

    file_url = gen_inner_file_get_url(token, filename)
    response = requests.get(file_url)
    if response.status_code != 200:
        raise RuntimeError(f'failed to fetch file content, status code: {response.status_code}')

    return response.content


def check_is_live_photo(repo_id, file_id, filename, username):
    """Check if file content is a live photo using exiftool.

    Writes content to a temp file and uses exiftool to parse XMP metadata.
    Returns True if XMP:MotionPhoto=1 or XMP:MicroVideo=1.
    """
    content = _get_file_content(repo_id, file_id, filename, username)

    with tempfile.NamedTemporaryFile(suffix='.heic') as temp_file:
        temp_file.write(content)
        temp_file.flush()
        with exiftool.ExifToolHelper() as et:
            metadata = et.get_metadata(temp_file.name)[0]
            motion_photo = _get_metadata_value(metadata, 'XMP:MotionPhoto')
            micro_video = _get_metadata_value(metadata, 'XMP:MicroVideo')
            gcam_motion_photo = _get_metadata_value(metadata, 'XMP-GCamera:MotionPhoto')
            gcam_micro_video = _get_metadata_value(metadata, 'XMP-GCamera:MicroVideo')
            if (
                _is_truthy_flag(motion_photo) or
                _is_truthy_flag(micro_video) or
                _is_truthy_flag(gcam_motion_photo) or
                _is_truthy_flag(gcam_micro_video)
            ):
                return True
    return False


def extract_video_data(repo_id, file_id, filename, username):
    """Extract embedded video data from a live photo using exiftool.

    Writes content to a temp file and uses exiftool command line to extract
    the QuickTime:MotionPhotoVideo binary data.
    """
    content = _get_file_content(repo_id, file_id, filename, username)

    with tempfile.NamedTemporaryFile(suffix='.heic') as temp_file:
        temp_file.write(content)
        temp_file.flush()

        cmd_extract = [
            'exiftool',
            '-b',   # output binary data
            '-s3',  # return data only, no extra tags
            '-QuickTime:MotionPhotoVideo',
            temp_file.name
        ]
        proc = subprocess.run(
            cmd_extract,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        if proc.stdout:
            return proc.stdout

        # fallback for GCamera Motion Photo: use MicroVideoOffset from end of file
        with exiftool.ExifToolHelper() as et:
            metadata = et.get_metadata(temp_file.name)[0]
        micro_offset = _get_metadata_value(metadata, 'XMP-GCamera:MicroVideoOffset')
        offset = _get_int_value(micro_offset, default=0)
        if offset > 0 and offset < len(content):
            return content[len(content) - offset:]
    return None


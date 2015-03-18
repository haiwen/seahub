import posixpath

from seaserv import seafile_api

from seahub.utils import get_service_url, get_file_type_and_ext
from seahub.utils.file_types import IMAGE
from seahub.settings import ENABLE_THUMBNAIL, THUMBNAIL_IMAGE_SIZE_LIMIT

def get_thumbnail_src(repo_id, obj_id, size):
    return posixpath.join(get_service_url(), "thumbnail", repo_id,
                          obj_id, size) + "/"

def allow_generate_thumbnail(username, repo, f):
    # check if thumbnail is allowed
    if seafile_api.check_repo_access_permission(repo.id, username) is None:
        # user can not access repo
        return False

    file_type, file_ext = get_file_type_and_ext(f.obj_name)
    if not repo.encrypted and file_type == IMAGE and ENABLE_THUMBNAIL \
        and f.file_size < THUMBNAIL_IMAGE_SIZE_LIMIT * 1024**2:
        return True
    else:
        return False

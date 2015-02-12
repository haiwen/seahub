import posixpath
from seahub.utils import get_service_url
def get_thumbnail_src(repo_id, obj_id, size):
    return posixpath.join(get_service_url(), "thumbnail", repo_id,
                          obj_id, size) + "/"

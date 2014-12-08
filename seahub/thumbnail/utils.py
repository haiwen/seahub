import os
from seahub.utils import get_site_scheme_and_netloc
def get_thumbnail_src(repo_id, obj_id, size):
    return os.path.join(get_site_scheme_and_netloc(), "thumbnail", repo_id,
                        obj_id, size)

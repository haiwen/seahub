import hashlib
import os

from seaserv import seafile_api

from seahub.utils import normalize_file_path

def create_user_draft_repo(username, org_id=-1):
    repo_name = 'Drafts'
    if org_id > 0:
        repo_id = seafile_api.create_org_repo(repo_name, '', username,
                                              passwd=None, org_id=org_id)
    else:
        repo_id = seafile_api.create_repo(repo_name, '', username,
                                          passwd=None)
    return repo_id

def get_draft_file_name(repo_id, file_path):
    file_path = normalize_file_path(file_path)
    file_name, file_ext = os.path.splitext(os.path.basename(file_path))
    md5 = hashlib.md5((repo_id + file_path).encode('utf-8')).hexdigest()[:10]

    return "%s-%s%s" % (file_name, md5, file_ext)

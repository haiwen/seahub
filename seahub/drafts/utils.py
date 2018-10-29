import hashlib
import os

from seaserv import seafile_api

from seahub.utils import normalize_file_path, check_filename_with_rename


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
    # md5 = hashlib.md5((repo_id + file_path).encode('utf-8')).hexdigest()[:10]

    draft_file_name = "%s%s%s" % (file_name, '(draft)', file_ext)
    new_file_name = check_filename_with_rename(repo_id, '/Drafts', draft_file_name)

    return new_file_name


def is_draft_file(repo_id, file_path):

    is_draft = False
    review_id = None
    draft_id = None

    file_path = normalize_file_path(file_path)

    from .models import Draft
    try:
        draft = Draft.objects.get(origin_repo_id=repo_id, draft_file_path=file_path)
        is_draft = True
        draft_id = draft.id
        if hasattr(draft, 'draftreview'):
            review_id = draft.draftreview.id
    except Draft.DoesNotExist:
        pass

    return is_draft, review_id, draft_id

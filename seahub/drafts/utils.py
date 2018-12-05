import hashlib
import os

from seaserv import seafile_api

from seahub.utils import normalize_file_path, check_filename_with_rename
from seahub.tags.models import FileUUIDMap


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

    draft_file_name = "%s%s%s" % (file_name, '(draft)', file_ext)

    return draft_file_name


def is_draft_file(repo_id, file_path):

    is_draft = False
    review_id = None
    draft_id = None
    review_status = None

    file_path = normalize_file_path(file_path)

    from .models import Draft
    try:
        draft = Draft.objects.get(origin_repo_id=repo_id, draft_file_path=file_path)
        is_draft = True
        draft_id = draft.id
        if hasattr(draft, 'draftreview'):
            review_id = draft.draftreview.id
            review_status = draft.draftreview.status
    except Draft.DoesNotExist:
        pass

    return is_draft, review_id, draft_id, review_status


def has_draft_file(repo_id, file_path):
    has_draft = False
    draft_file_path = None
    draft_id = None
    review_id = None
    review_status = None

    file_path = normalize_file_path(file_path)
    parent_path = os.path.dirname(file_path)
    filename = os.path.basename(file_path)

    file_uuid = FileUUIDMap.objects.get_fileuuidmap_by_path(
            repo_id, parent_path, filename, is_dir=False)

    from .models import Draft
    if file_uuid:
        try:
            draft = Draft.objects.get(origin_file_uuid=file_uuid)
            if hasattr(draft, 'draftreview'):
                review_id = draft.draftreview.id
                review_status = draft.draftreview.status

            draft_id = draft.id
            has_draft = True
            draft_file_path = draft.draft_file_path
        except Draft.DoesNotExist:
            pass

    return has_draft, draft_file_path, draft_id, review_id, review_status

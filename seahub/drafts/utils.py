import hashlib
import os
import logging
import posixpath

from seaserv import seafile_api

from seahub.utils import normalize_file_path, check_filename_with_rename
from seahub.tags.models import FileUUIDMap


logger = logging.getLogger(__name__)


def create_user_draft_repo(username, org_id=-1):
    repo_name = 'Drafts'
    if org_id and org_id > 0:
        repo_id = seafile_api.create_org_repo(repo_name, '', username, org_id)
    else:
        repo_id = seafile_api.create_repo(repo_name, '', username)
    return repo_id


def get_draft_file_name(repo_id, file_path):
    file_path = normalize_file_path(file_path)
    file_name, file_ext = os.path.splitext(os.path.basename(file_path))

    draft_file_name = "%s%s%s" % (file_name, '(draft)', file_ext)
    draft_file_name = check_filename_with_rename(repo_id, '/Drafts', draft_file_name)

    return draft_file_name


def is_draft_file(repo_id, file_path):
    is_draft = False
    file_path = normalize_file_path(file_path)

    from .models import Draft
    try:
        draft = Draft.objects.filter(origin_repo_id=repo_id, draft_file_path=file_path)
        if draft:
            is_draft = True
    except Draft.DoesNotExist:
        pass

    return is_draft


def has_draft_file(repo_id, file_path):
    has_draft = False
    file_path = normalize_file_path(file_path)
    parent_path = os.path.dirname(file_path)
    filename = os.path.basename(file_path)

    file_uuid = FileUUIDMap.objects.get_fileuuidmap_by_path(
            repo_id, parent_path, filename, is_dir=False)

    from .models import Draft
    if file_uuid:
        try:
            d = Draft.objects.filter(origin_file_uuid=file_uuid.uuid)
            if d:
                d = d[0]
                file_id = seafile_api.get_file_id_by_path(repo_id, d.draft_file_path)
                if file_id:
                    has_draft = True
            else:
                Draft.DoesNotExist
        except Draft.DoesNotExist:
            pass

    return has_draft


def get_file_draft(repo_id, file_path, is_draft=False, has_draft=False):
    draft = {}
    draft['draft_id'] = None
    draft['draft_file_path'] = ''
    draft['draft_origin_file_path'] = ''

    from .models import Draft

    if is_draft:
        d = Draft.objects.filter(origin_repo_id=repo_id, draft_file_path=file_path)
        if d:
            d = d[0]
            uuid = FileUUIDMap.objects.get_fileuuidmap_by_uuid(d.origin_file_uuid)
            file_path = posixpath.join(uuid.parent_path, uuid.filename)
            draft['draft_id'] = d.id
            draft['draft_file_path'] = d.draft_file_path
            draft['draft_origin_file_path'] = file_path
        else:
            Draft.DoesNotExist

    if has_draft:
        file_path = normalize_file_path(file_path)
        parent_path = os.path.dirname(file_path)
        filename = os.path.basename(file_path)

        file_uuid = FileUUIDMap.objects.get_fileuuidmap_by_path(
                repo_id, parent_path, filename, is_dir=False)

        d = Draft.objects.filter(origin_file_uuid=file_uuid.uuid)
        if d:
            d = d[0]
            draft['draft_id'] = d.id
            draft['draft_file_path'] = d.draft_file_path
        else:
            Draft.DoesNotExist

    return draft


def send_draft_publish_msg(draft, username, path):
    """
    send draft publish msg to seafevents
    """

    repo_id = draft.origin_repo_id
    old_path = draft.draft_file_path

    msg = '%s\t%s\t%s\t%s\t%s\t%s' % ("publish", "draft", repo_id, username, path, old_path)

    try:
        seafile_api.publish_event('seahub.draft', msg)
    except Exception as e:
        logger.error("Error when sending draft publish message: %s" % str(e))

import hashlib
import os
import logging
import posixpath

from seaserv import seafile_api
from seaserv import send_message

from seahub.utils import normalize_file_path, check_filename_with_rename
from seahub.tags.models import FileUUIDMap


logger = logging.getLogger(__name__)


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
    draft_file_name = check_filename_with_rename(repo_id, '/Drafts', draft_file_name)

    return draft_file_name


def is_draft_file(repo_id, file_path):
    is_draft = False
    file_path = normalize_file_path(file_path)

    from .models import Draft
    try:
        Draft.objects.get(origin_repo_id=repo_id, draft_file_path=file_path)
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
            d = Draft.objects.get(origin_file_uuid=file_uuid)
            file_id = seafile_api.get_file_id_by_path(repo_id, d.draft_file_path)
            if file_id:
                has_draft = True

        except Draft.DoesNotExist:
            pass

    return has_draft


def get_file_draft_and_related_review(repo_id, file_path, is_draft=False, has_draft=False):
    review = {}
    review['review_id'] = None
    review['review_status'] = None
    review['draft_id'] = None
    review['draft_file_path'] = ''

    from .models import Draft, DraftReview

    if is_draft:
        d = Draft.objects.get(origin_repo_id=repo_id, draft_file_path=file_path)
        review['draft_id'] = d.id
        review['draft_file_path'] = d.draft_file_path

        # return review (closed / open)
        try:
            d_r = DraftReview.objects.get(origin_repo_id=repo_id, draft_file_path=file_path, draft_id=d)
            review['review_id'] = d_r.id
            review['review_status'] = d_r.status
        except DraftReview.DoesNotExist:
            pass

    if has_draft:
        file_path = normalize_file_path(file_path)
        parent_path = os.path.dirname(file_path)
        filename = os.path.basename(file_path)

        file_uuid = FileUUIDMap.objects.get_fileuuidmap_by_path(
                repo_id, parent_path, filename, is_dir=False)

        d = Draft.objects.get(origin_file_uuid=file_uuid)
        # return review (closed / open)
        if file_uuid:
            try:
                d_r = DraftReview.objects.get(origin_file_uuid=file_uuid, draft_id=d)
                review['review_id'] = d_r.id
                review['review_status'] = d_r.status
            except DraftReview.DoesNotExist:
                pass

        review['draft_id'] = d.id
        review['draft_file_path'] = d.draft_file_path

    return review


def send_review_status_msg(request, review):
    """
    send review status change to seafevents
    """
    status = review.status.lower()
    if status not in ['open', 'finished', 'closed']:
        logger.warn('Invalid status in review status msg: %s' % status)
        return

    repo_id = review.origin_repo_id
    op_user = request.user.username
    review_id = review.id
    draft_flag = os.path.splitext(os.path.basename(review.draft_file_path))[0][-7:]
    if draft_flag == '(draft)':
        old_path = review.draft_file_path
        if status == 'finished':
            publish_path = posixpath.join(review.origin_file_uuid.parent_path, review.origin_file_uuid.filename)
        else:
            publish_path = None
    else:
        old_path = posixpath.join(review.origin_file_uuid.parent_path, review.origin_file_uuid.filename)
        publish_path = review.draft_file_path if status == 'finished' else None
    path = publish_path if publish_path else old_path

    creator = review.creator

    msg = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s' % (status, repo_id, op_user, "review", path, review_id, old_path, creator)
    msg_utf8 = msg.encode('utf-8')

    try:
        send_message('seahub.review', msg_utf8)
    except Exception as e:
        logger.error("Error when sending %s message: %s" % (status, str(e)))

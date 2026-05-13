import logging
import hashlib
from sqlalchemy import text

from seahub_io.seasearch.utils.commit_differ import CommitDiffer

from seafobj import commit_mgr
from seafobj.exceptions import GetObjectError

logger = logging.getLogger(__name__)

SYS_DIRS = ['images', '_Internal']
WIKI_DIRS = ['wiki-pages']

def get_library_diff_files(repo_id, old_commit_id, new_commit_id):
    version = 1
    if old_commit_id == new_commit_id:
        return [], [], [], [], [], version

    old_root = None
    if old_commit_id:
        try:
            old_commit = commit_mgr.load_commit(repo_id, 0, old_commit_id)
            old_root = old_commit.root_id
        except GetObjectError as e:
            logger.debug(e)
            old_root = None

    try:
        new_commit = commit_mgr.load_commit(repo_id, 0, new_commit_id)
    except GetObjectError as e:
        # new commit should exists in the obj store
        logger.warning(e)
        return [], [], [], [], [], version

    new_root = new_commit.root_id
    version = new_commit.get_version()

    try:
        differ = CommitDiffer(repo_id, version, old_root, new_root)
        added_files, deleted_files, added_dirs, deleted_dirs, modified_files = differ.diff(new_commit.ctime)
    except Exception as e:
        logger.warning('repo: %s, version: %s, old_commit_id:%s, nea_commit_id: %s, old_root:%s, new_root: %s, differ error: %s',
                        repo_id, version, old_commit_id, new_commit_id, old_root, new_root, e)
        return [], [], [], [], [], version

    return added_files, deleted_files, modified_files, added_dirs, deleted_dirs, version


def md5(text):
    return hashlib.md5(text.encode()).hexdigest()


def is_sys_dir_or_file(path):
    if path.split('/')[1] in SYS_DIRS:
        return True
    return False


def need_index_metadata_info(repo_id, session):
    with session() as session:
        sql = "SELECT enabled FROM repo_metadata WHERE repo_id='%s'" % repo_id
        record = session.execute(text(sql)).fetchone()

    if not record or not record[0]:
        return False

    return True


def is_wiki_page(path):
    if path.split('/')[1] in WIKI_DIRS and path.endswith('.sdoc'):
        return True
    return False

import logging
from seaserv import seafile_api

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'
HTTP_520_OPERATION_FAILED = 520


def permission_check_admin_owner(username, repo_id):  # maybe add more complex logic in the future
    return username == seafile_api.get_repo_owner(repo_id)

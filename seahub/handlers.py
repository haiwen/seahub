# Copyright (c) 2012-2016 Seafile Ltd.

import logging
from . import settings
import datetime

from seaserv import seafile_api, get_org_id_by_repo_id
logger = logging.getLogger(__name__)

try:

    import seafevents_api

    def repo_created_cb(sender, **kwargs):
        org_id = kwargs['org_id']
        creator = kwargs['creator']
        repo_id = kwargs['repo_id']
        repo_name = kwargs['repo_name']

        # Move here to avoid model import during Django setup.
        # TODO: Don't register signal/handlers during Seahub start.

        if org_id and org_id > 0:
            related_users = seafile_api.org_get_shared_users_by_repo(org_id, repo_id)
        else:
            related_users = seafile_api.get_shared_users_by_repo(repo_id)
            org_id = -1

        if creator not in related_users:
            related_users.append(creator)

        record = {
            'op_type': 'create',
            'obj_type': 'repo',
            'timestamp': datetime.datetime.utcnow(),
            'repo_id': repo_id,
            'repo_name': repo_name,
            'path': '/',
            'op_user': creator,
            'related_users': related_users,
            'org_id': org_id,
        }

        from .utils import SeafEventsSession
        session = SeafEventsSession()
        seafevents_api.save_user_activity(session, record)
        session.close()

        LIBRARY_TEMPLATES = getattr(settings, 'LIBRARY_TEMPLATES', {})
        library_template = kwargs['library_template']

        if LIBRARY_TEMPLATES and library_template:
            try:
                dir_path_list = LIBRARY_TEMPLATES[library_template]
                for dir_path in dir_path_list:
                    seafile_api.mkdir_with_parents(repo_id, '/', dir_path.strip('/'), creator)
            except Exception as e:
                logger.error(e)

    def repo_deleted_cb(sender, **kwargs):
        """When a repo is deleted, an event would be added to every user in all
        groups to which this repo is shared.

        """
        org_id = kwargs['org_id']
        operator = kwargs['operator']

        repo_owner = kwargs['repo_owner']
        repo_id = kwargs['repo_id']
        repo_name = kwargs['repo_name']

        if org_id and org_id > 0:
            related_users = seafile_api.org_get_shared_users_by_repo(org_id, repo_id)
        else:
            related_users = seafile_api.get_shared_users_by_repo(repo_id)
            org_id = -1

        if repo_owner not in related_users:
            related_users.append(repo_owner)

        record = {
            'op_type': 'delete',
            'obj_type': 'repo',
            'timestamp': datetime.datetime.utcnow(),
            'repo_id': repo_id,
            'repo_name': repo_name,
            'path': '/',
            'op_user': operator,
            'related_users': related_users,
            'org_id': org_id if org_id and org_id > 0 else -1,
        }

        from .utils import SeafEventsSession
        session = SeafEventsSession()
        seafevents_api.save_user_activity(session, record)
        session.close()

    def clean_up_repo_trash_cb(sender, **kwargs):
        """When a repo trash is deleted, the operator will be recorded.
        """
        org_id = kwargs['org_id']
        operator = kwargs['operator']
        repo_id = kwargs['repo_id']
        days = kwargs.get('days', None)
        repo_name = kwargs['repo_name']
        repo_owner = kwargs['repo_owner']

        if org_id and org_id > 0:
            related_users = seafile_api.org_get_shared_users_by_repo(org_id, repo_id)
        else:
            related_users = seafile_api.get_shared_users_by_repo(repo_id)
            org_id = -1

        if repo_owner not in related_users:
            related_users.append(repo_owner)

        record = {
            'op_type': 'clean-up-trash',
            'obj_type': 'repo',
            'timestamp': datetime.datetime.utcnow(),
            'repo_id': repo_id,
            'repo_name': repo_name,
            'path': '/',
            'days': days,
            'op_user': operator,
            'related_users': related_users,
            'org_id': org_id,
        }

        from .utils import SeafEventsSession
        session = SeafEventsSession()
        seafevents_api.save_user_activity(session, record)
        session.close()

    def repo_restored_cb(sender, **kwargs):
        repo_id = kwargs['repo_id']
        operator = kwargs['operator']
        repo = seafile_api.get_repo(repo_id)
        org_id = get_org_id_by_repo_id(repo_id)
        if org_id and org_id > 0:
            related_users = seafile_api.org_get_shared_users_by_repo(org_id, repo_id)
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            related_users = seafile_api.get_shared_users_by_repo(repo_id)
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if repo_owner not in related_users:
            related_users.append(repo_owner)

        record = {
            'op_type': 'recover',
            'obj_type': 'repo',
            'timestamp': datetime.datetime.utcnow(),
            'repo_id': repo_id,
            'repo_name': repo.repo_name,
            'path': '/',
            'op_user': operator,
            'related_users': related_users,
            'org_id': org_id,
        }

        from .utils import SeafEventsSession
        session = SeafEventsSession()
        seafevents_api.save_user_activity(session, record)
        session.close()
except ImportError:

    def repo_created_cb(sender, **kwargs):
        pass

    def repo_restored_cb(sender, **kwargs):
        pass

    def repo_deleted_cb(sender, **kwargs):
        pass

    def clean_up_repo_trash_cb(sender, **kwargs):
        pass

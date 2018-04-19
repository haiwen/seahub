# Copyright (c) 2012-2016 Seafile Ltd.

import logging
import settings
from seaserv import seafile_api
logger = logging.getLogger(__name__)

if not hasattr(settings, 'EVENTS_CONFIG_FILE'):
    def repo_created_cb(sender, **kwargs):
        pass

    def repo_deleted_cb(sender, **kwargs):
        pass

    def clean_up_repo_trash_cb(sender, **kwargs):
        pass

else:

    import seafevents

    def repo_created_cb(sender, **kwargs):
        org_id  = kwargs['org_id']
        creator = kwargs['creator']
        repo_id = kwargs['repo_id']
        repo_name = kwargs['repo_name']

        etype = 'repo-create'
        detail = {
            'creator': creator,
            'repo_id': repo_id,
            'repo_name': repo_name,
        }

        users = [creator]

        # Move here to avoid model import during Django setup.
        # TODO: Don't register signal/hanlders during Seahub start.
        from utils import SeafEventsSession

        session = SeafEventsSession()
        if org_id > 0:
            seafevents.save_org_user_events(session, org_id, etype, detail, users, None)
        else:
            seafevents.save_user_events(session, etype, detail, users, None)
        session.close()

        LIBRARY_TEMPLATES = getattr(settings, 'LIBRARY_TEMPLATES', {})
        library_template = kwargs['library_template']

        if LIBRARY_TEMPLATES and library_template:
            if isinstance(library_template, unicode):
                library_template = library_template.encode('utf-8')

            try:
                dir_path_list = LIBRARY_TEMPLATES[library_template]
                for dir_path in dir_path_list:
                    seafile_api.mkdir_with_parents(repo_id, '/',
                            dir_path.strip('/'), creator)
            except Exception as e:
                logger.error(e)

    def repo_deleted_cb(sender, **kwargs):
        """When a repo is deleted, an event would be added to every user in all
        groups to which this repo is shared.

        """
        org_id  = kwargs['org_id']
        usernames = kwargs['usernames']

        repo_owner = kwargs['repo_owner']
        repo_id = kwargs['repo_id']
        repo_name = kwargs['repo_name']

        etype = 'repo-delete'
        detail = {
            'repo_owner': repo_owner,
            'repo_id': repo_id,
            'repo_name': repo_name,
        }

        users = usernames

        from utils import SeafEventsSession
        session = SeafEventsSession()
        if org_id > 0:
            seafevents.save_org_user_events(session, org_id, etype, detail, users, None)
        else:
            seafevents.save_user_events(session, etype, detail, users, None)
        session.close()

    def clean_up_repo_trash_cb(sender, **kwargs):
        """When a repo trash is deleted, the operator will be recorded.
        """
        org_id = kwargs['org_id']
        operator = kwargs['operator']
        repo_id = kwargs['repo_id']
        days = kwargs.get('days', None)
        repo_name = kwargs['repo_name']
        etype = 'clean-up-repo-trash'

        detail = {
            'repo_id': repo_id,
            'days': days,
            'repo_name': repo_name
        }

        users = [operator]

        from utils import SeafEventsSession
        session = SeafEventsSession()
        if org_id > 0:
            seafevents.save_org_user_events(session, org_id, etype, detail, users, None)
        else:
            seafevents.save_user_events(session, etype, detail, users, None)
        session.close()

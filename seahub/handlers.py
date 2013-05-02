import settings

if not hasattr(settings, 'EVENTS_CONFIG_FILE'):
    def repo_created_cb(sender, **kwargs):
        pass

    def repo_deleted_cb(sender, **kwargs):
        pass
else:        

    import seafevents
    from utils import SeafEventsSession

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

        session = SeafEventsSession()
        if org_id > 0:
            seafevents.save_org_user_events (session, org_id, etype, detail, users, None)
        else:
            seafevents.save_user_events (session, etype, detail, users, None)
        session.close()

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

        session = SeafEventsSession()
        if org_id > 0:
            seafevents.save_org_user_events (session, org_id, etype, detail, users, None)
        else:
            seafevents.save_user_events (session, etype, detail, users, None)
        session.close()

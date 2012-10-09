import settings

if not hasattr(settings, 'EVENTS_CONFIG_FILE'):
    def repo_created_cb(sender, **kwargs):
        pass

    def repo_deleted_cb(sender, **kwargs):
        pass
else:        

    import seafevents
    from utils import get_seafevents_session

    def repo_created_cb(sender, **kwargs):
        creator = kwargs['creator']
        repo_id = kwargs['repo_id']
        repo_name = kwargs['repo_name']

        detail = {
            'creator': creator,
            'repo_id': repo_id,
            'repo_name': repo_name,
        }

        users = [creator]

        session = get_seafevents_session()
        seafevents.save_user_events (session, 'repo-create', detail, users, None)
        session.close()

    def repo_deleted_cb(sender, **kwargs):
        """When a repo is deleted, an event would be added to every user in all
        groups to which this repo is shared.

        """
        usernames = kwargs['usernames']

        repo_owner = kwargs['repo_owner']
        repo_id = kwargs['repo_id']
        repo_name = kwargs['repo_name']

        detail = {
            'repo_owner': repo_owner,
            'repo_id': repo_id,
            'repo_name': repo_name,
        }

        users = usernames

        session = get_seafevents_session()
        seafevents.save_user_events (session, 'repo-delete', detail, users, None)
        session.close()


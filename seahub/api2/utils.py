# Utility functions for api2

from seaserv import seafile_api

def is_repo_writable(repo_id, username):
    """Check whether a user has write permission to a repo.
    
    Arguments:
    - `repo_id`:
    - `username`:
    """
    if seafile_api.check_repo_access_permission(repo_id, username) == 'rw':
        return True
    else:
        return False

def is_repo_accessible(repo_id, username):
    """Check whether a user can read or write to a repo.
    
    Arguments:
    - `repo_id`:
    - `username`:
    """
    if seafile_api.check_repo_access_permission(repo_id, username) is None:
        return False
    else:
        return True
    
    


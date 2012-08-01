"""

Repo:
    id:                      Repo ID
    name:                    Repo Name
    desc:                    Repo description
    worktree:                The full path of the worktree of the repo
    worktree_changed:        True if the worktree is changed
    worktree_checktime:      The last check time of whether worktree is changed
    head_branch:             The name of the head branch
    enctrypted:              True if the repo is encrypted
    passwd:                  The password
    

Branch:
    name:
    commit_id:
    repo_id:

Commit:
    id:
    creator_name:
    creator:                 The id of the creator
    desc:
    ctime:
    repo_id:
    root_id:
    parent_id:
    second_parent_id:


"""


from datetime import datetime
import json
import os
import sys

import ccnet
import seafile
from pysearpc import SearpcError

if 'win' in sys.platform:
    DEFAULT_CCNET_CONF_PATH = "~/ccnet"
else:    
    DEFAULT_CCNET_CONF_PATH = "~/.ccnet"

if 'CCNET_CONF_DIR' in os.environ:
    CCNET_CONF_PATH = os.environ['CCNET_CONF_DIR']
else:
    CCNET_CONF_PATH = DEFAULT_CCNET_CONF_PATH

print "Load config from " + CCNET_CONF_PATH
CCNET_CONF_PATH = os.path.normpath(os.path.expanduser(CCNET_CONF_PATH))

pool = ccnet.ClientPool(CCNET_CONF_PATH)
ccnet_rpc = ccnet.CcnetRpcClient(pool, req_pool=True)
ccnet_threaded_rpc = ccnet.CcnetThreadedRpcClient(pool, req_pool=True)
monitor_rpc = seafile.MonitorRpcClient(pool)
seafserv_rpc = seafile.ServerRpcClient(pool, req_pool=True)
seafserv_threaded_rpc = seafile.ServerThreadedRpcClient(pool, req_pool=True)
    

#### Basic ccnet API ####


def get_ccnetuser(username=None, userid=None):
    # Get emailuser from db
    if username:
        emailuser = ccnet_threaded_rpc.get_emailuser(username)
    if userid:
        emailuser = ccnet_threaded_rpc.get_emailuser_by_id(userid)
    if not emailuser:
        return None

    # Check whether is business account
    # orgs = ccnet_threaded_rpc.get_orgs_by_user(emailuser.email)
    # emailuser.org = org
    
    # And convert to ccnetuser
    from seahub.base.accounts import convert_to_ccnetuser
    ccnetuser = convert_to_ccnetuser(emailuser)

    return ccnetuser

def get_emailusers(start, limit):
    try:
        users = ccnet_threaded_rpc.get_emailusers(start, limit)
    except SearpcError:
        users = []
    return users
    
# def get_groups():
#     """Get group object list. """
#     group_ids = ccnet_threaded_rpc.list_groups()
#     if not group_ids:
#         return []
#     groups = []
#     for group_id in group_ids.split("\n"):
#         # too handle the ending '\n'
#         if group_id == '':
#             continue
#         group = ccnet_threaded_rpc.get_group(group_id)
#         groups.append(group)
#     return groups


def get_group(group_id):
    group_id_int = int(group_id)
    try:
        group = ccnet_threaded_rpc.get_group(group_id_int)
    except SearpcError:
        group = None
    return group

def check_group_staff(group_id_int, user_or_username):
    """Check where user is group staff"""
    from seahub.base.accounts import CcnetUser
    if isinstance(user_or_username, CcnetUser):
        user_or_username = user_or_username.username
        
    return ccnet_threaded_rpc.check_group_staff(group_id_int, user_or_username)

def remove_group_user(user):
    """
    Remove group user relationship.
    """
    return ccnet_threaded_rpc.remove_group_user(user)

def get_org_groups(org_id, start, limit):
    try:
        groups = ccnet_threaded_rpc.get_org_groups(org_id, 0, sys.maxint)
    except SearpcError:
        groups = []
    return groups

def get_personal_groups(email):
    try:
        groups_all = ccnet_threaded_rpc.get_groups(email)
    except SearpcError:
        return []

    personal_groups = []
    for group in groups_all:
        if not ccnet_threaded_rpc.is_org_group(group.id):
            personal_groups.append(group)
            
    return personal_groups
    
def create_org(org_name, url_prefix, username):
    ccnet_threaded_rpc.create_org(org_name, url_prefix, username)

def get_orgs_by_user(user):
    try:
        orgs = ccnet_threaded_rpc.get_orgs_by_user(user)
    except SearpcError:
        orgs = []

    return orgs

def get_org_by_url_prefix(url_prefix):
    try:
        org = ccnet_threaded_rpc.get_org_by_url_prefix(url_prefix)
    except SearpcError:
        org = None

    return org

def get_org_by_id(org_id):
    try:
        org = ccnet_threaded_rpc.get_org_by_id(org_id)
    except SearpcError:
        org = None

    return org

def get_user_current_org(user, url_prefix):
    orgs = get_orgs_by_user(user)
    for org in orgs:
        if org.url_prefix == url_prefix:
            return org
    return None

def add_org_user(org_id, email, is_staff):
    try:
        ccnet_threaded_rpc.add_org_user(org_id, email, is_staff)
    except SearpcError:
        pass

def remove_org_user(org_id, email):
    try:
        ccnet_threaded_rpc.remove_org_user(org_id, email)
    except SearpcError:
        pass
    
def send_command(command):
    client = pool.get_client()
    client.send_cmd(command)
    ret = client.response[2]
    pool.return_client(client)
    return ret


######## seafserv API ####

def get_repos():
    """
    Return repository list.

    """
    return seafserv_threaded_rpc.get_repo_list("", 100)

def create_org_repo(repo_name, repo_desc, user, passwd, org_id):
    """
    Create org repo, return valid repo id if success.
    """
    try:
        repo_id = seafserv_threaded_rpc.create_org_repo(repo_name, repo_desc,
                                                        user, passwd, org_id)
    except SearpcError:
        repo_id = None
        
    return repo_id
    
def get_org_repos(org_id, start, limit):
    """
    List repos created in org.
    """
    try:
        repos = seafserv_threaded_rpc.get_org_repo_list(org_id, start, limit)
    except SearpcError:
        repos = []

    return repos

def get_org_id_by_repo_id(repo_id):
    """
    Get org id according repo id.
    """
    try:
        org_id = seafserv_threaded_rpc.get_org_id_by_repo_id(repo_id)
    except SearpcError:
        org_id = ''
    return org_id

def get_repo(repo_id):
    return seafserv_threaded_rpc.get_repo(repo_id)

def is_repo_owner(user, repo_id):
    """
    Check whether user is repo owner.
    """
    try:
        ret = seafserv_threaded_rpc.is_repo_owner(user, repo_id)
    except SearpcError:
        ret = 0
    return ret
    
def get_commits(repo_id, offset, limit):
    """Get commit lists."""
    return seafserv_threaded_rpc.get_commit_list(repo_id, offset, limit)

def get_branches(repo_id):
    """Get branches of a given repo"""
    return seafserv_threaded_rpc.branch_gets(repo_id)

def get_binding_peerids(email):
    """Get peer ids of a given email"""
    try:
        peer_ids = ccnet_threaded_rpc.get_binding_peerids(email)
    except SearpcError:
        return []

    if not peer_ids:
        return []
    
    peerid_list = []
    for peer_id in peer_ids.split("\n"):
        if peer_id == '':
            continue
        peerid_list.append(peer_id)
    return peerid_list

def get_group_repoids(group_id=None):
    """Get repo ids of a given group id or username"""
    try:
        repo_ids = seafserv_threaded_rpc.get_group_repoids(group_id)
    except SearpcError:
        return []

    if not repo_ids:
        return []
    
    repoid_list = []
    for repo_id in repo_ids.split("\n"):
        if repo_id == '':
            continue
        repoid_list.append(repo_id)
    return repoid_list

def is_valid_filename(file_or_dir):
    """
    Check whether file name or directory name is valid.
    """
    try:
        ret = seafserv_threaded_rpc.is_valid_filename('', file_or_dir)
    except SearpcError:
        ret = 0

    return ret

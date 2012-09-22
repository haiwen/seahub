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
import ConfigParser

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
MAX_INT = 2147483647

pool = ccnet.ClientPool(CCNET_CONF_PATH)
ccnet_rpc = ccnet.CcnetRpcClient(pool, req_pool=True)
ccnet_threaded_rpc = ccnet.CcnetThreadedRpcClient(pool, req_pool=True)
monitor_rpc = seafile.MonitorRpcClient(pool)
seafserv_rpc = seafile.ServerRpcClient(pool, req_pool=True)
seafserv_threaded_rpc = seafile.ServerThreadedRpcClient(pool, req_pool=True)

# load ccnet server addr and port from ccnet.conf.
# 'addr:port' is used when downloading a repo
ccnet_config = ConfigParser.ConfigParser()
ccnet_config.read(os.path.join(CCNET_CONF_PATH, 'ccnet.conf'))

if ccnet_config.has_option('General', 'SERVICE_URL') and \
   ccnet_config.has_option('Network', 'PORT'):
    service_url = ccnet_config.get('General', 'SERVICE_URL').lstrip('http://')
    if ':' in service_url:
        # strip http port such as ':8000' in 'http://192.168.1.101:8000'
        idx = service_url.rindex(':')
        service_url = service_url[:idx]
    if '/' in service_url:
        # strip url suffix like the '/seahub' part of www.gonggeng.org/seahub
        idx = service_url.rindex('/')
        service_url = service_url[:idx]

    CCNET_SERVER_ADDR = service_url
    CCNET_SERVER_PORT = ccnet_config.get('Network', 'PORT')
else:
    print "Warning: SERVICE_URL not set in ccnet.conf"
    CCNET_SERVER_ADDR = None
    CCNET_SERVER_PORT = None
    

#### Basic ccnet API ####

def get_emailusers(start, limit):
    try:
        users = ccnet_threaded_rpc.get_emailusers(start, limit)
    except SearpcError:
        users = []
    return users

# group
def get_group(group_id):
    group_id_int = int(group_id)
    try:
        group = ccnet_threaded_rpc.get_group(group_id_int)
    except SearpcError:
        group = None
    return group

def get_personal_groups(start, limit):
    try:
        groups_all = ccnet_threaded_rpc.get_all_groups(start, limit)
    except SearpcError:
        return []
    return [ x for x in groups_all if not is_org_group(x.id) ]

def get_personal_groups_by_user(email):
    try:
        groups_all = ccnet_threaded_rpc.get_groups(email)
    except SearpcError:
        return []

    personal_groups = []
    for group in groups_all:
        if not is_org_group(group.id):
            personal_groups.append(group)
            
            return personal_groups
    
# group user
def is_group_user(group_id, user):
    try:
        ret = ccnet_threaded_rpc.is_group_user(group_id, user)
    except SearpcError:
        ret = 0
    return ret

def check_group_staff(group_id_int, user_or_username):
    """Check where user is group staff"""
    from seahub.base.accounts import User
    if isinstance(user_or_username, User):
        user_or_username = user_or_username.username
        
    return ccnet_threaded_rpc.check_group_staff(group_id_int, user_or_username)

def remove_group_user(user):
    """
    Remove group user relationship.
    """
    return ccnet_threaded_rpc.remove_group_user(user)

def get_group_members(group_id):
    group_id_int = int(group_id)
    try:
        members = ccnet_threaded_rpc.get_group_members(group_id_int)
    except SearpcError:
        members = []
    return members

# org group
def is_org_group(group_id):
    try:
        ret = ccnet_threaded_rpc.is_org_group(group_id)
    except SearpcError:
        ret = -1
    return True if ret == 1 else False

def get_org_id_by_group(group_id):
    try:
        org_id = ccnet_threaded_rpc.get_org_id_by_group(group_id)
    except SearpcError:
        org_id = -1
    return org_id

def get_org_groups(org_id, start, limit):
    try:
        groups = ccnet_threaded_rpc.get_org_groups(org_id, start, limit)
    except SearpcError:
        groups = []
    return groups

def get_org_groups_by_user(org_id, user):
    """
    Get user's groups in org.
    """
    try:
        groups_all = ccnet_threaded_rpc.get_groups(user)
    except SearpcError:
        return []

    org_groups = []
    for group in groups_all:
        if org_id == ccnet_threaded_rpc.get_org_id_by_group(group.id):
            org_groups.append(group)
            
    return org_groups
    
# org
def create_org(org_name, url_prefix, username):
    ccnet_threaded_rpc.create_org(org_name, url_prefix, username)

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

# org user
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

def org_user_exists(org_id, user):
    try:
        ret = ccnet_threaded_rpc.org_user_exists(org_id, user)
    except SearpcError:
        ret = -1
    return True if ret == 1 else False

def get_org_users_by_url_prefix(url_prefix, start, limit):
    """
    List org users.
    """
    try:
        users = ccnet_threaded_rpc.get_org_emailusers(url_prefix, start, limit)
    except:
        users = []
    return users

def get_orgs_by_user(user):
    try:
        orgs = ccnet_threaded_rpc.get_orgs_by_user(user)
    except SearpcError:
        orgs = []

    return orgs

def is_org_staff(org_id, user):
    """
    Check whether user is staff of a org.
    """
    try:
        ret = ccnet_threaded_rpc.is_org_staff(org_id, user)
    except SearpcError:
        ret = -1
    return True if ret == 1 else False

def get_user_current_org(user, url_prefix):
    orgs = get_orgs_by_user(user)
    for org in orgs:
        if org.url_prefix == url_prefix:
            return org
    return None

def send_command(command):
    client = pool.get_client()
    client.send_cmd(command)
    ret = client.response[2]
    pool.return_client(client)
    return ret

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

######## seafserv API ####

# repo
def get_repos():
    """
    Return repository list.

    """
    return seafserv_threaded_rpc.get_repo_list("", 100)

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

# org repo
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

def is_org_repo(repo_id):
    org_id = get_org_id_by_repo_id(repo_id)
    return True if org_id > 0 else False

def list_org_repos_by_owner(org_id, user):
    try:
        repos = seafserv_threaded_rpc.list_org_repos_by_owner(org_id, user)
    except SearpcError:
        repos = []
    return repos

def get_org_repos(org_id, start, limit):
    """
    List repos created in org.
    """
    try:
        repos = seafserv_threaded_rpc.get_org_repo_list(org_id, start, limit)
    except SearpcError:
        repos = []

    if repos:
        for r in repos:
            r.owner = get_org_repo_owner(r.id)
            print org_id, type(org_id), r.id, r.owner
            
    return repos

def get_org_id_by_repo_id(repo_id):
    """
    Get org id according repo id.
    """
    try:
        org_id = seafserv_threaded_rpc.get_org_id_by_repo_id(repo_id)
    except SearpcError:
        org_id = -1
    return org_id

def is_org_repo_owner(org_id, repo_id, user):
    """
    Check whether user is org repo owner.
    NOTE:
    	`org_id` may used in future.
    """
    owner = get_org_repo_owner(repo_id)
    if not owner:
        return False 
    return True if owner == user else False

def get_org_repo_owner(repo_id):
    """
    Get owner of repo repo.
    """
    try:
        owner = seafserv_threaded_rpc.get_org_repo_owner(repo_id)
    except SearpcError:
        owner = None
    return owner

# commit
def get_commits(repo_id, offset, limit):
    """Get commit lists."""
    return seafserv_threaded_rpc.get_commit_list(repo_id, offset, limit)

# branch
def get_branches(repo_id):
    """Get branches of a given repo"""
    return seafserv_threaded_rpc.branch_gets(repo_id)

# group repo
def get_shared_groups_by_repo(repo_id):
    try:
        group_ids = seafserv_threaded_rpc.get_shared_groups_by_repo(repo_id)
    except SearpcError:
        group_ids = ''
    if not group_ids:
        return []

    groups = []
    for group_id in group_ids.split('\n'):
        if not group_id:
            continue
        group = get_group(group_id)
        if group:
            groups.append(group)
    return groups

def get_group_repoids(group_id):
    """Get repo ids of a given group id."""
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

def get_group_repos(group_id, user):
    """Get repos of a given group id."""
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

    repos = []
    for repo_id in repoid_list:
        if not repo_id:
            continue
        repo = get_repo(repo_id)
        if not repo:
            continue

        repo.owner = seafserv_threaded_rpc.get_group_repo_owner(repo_id)
        repo.share_from_me = True if user == repo.owner else False

        try:
            repo.latest_modify = get_commits(repo.id, 0, 1)[0].ctime
        except:
            repo.latest_modify = None

        repos.append(repo)
    repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
    
    return repos

# org group repo
def del_org_group_repo(repo_id, org_id, group_id):
    seafserv_threaded_rpc.del_org_group_repo(repo_id, org_id, group_id)
        
def get_org_group_repos(org_id, group_id, user):
    """Get org repos of a given group id."""
    try:
        repo_ids = seafserv_threaded_rpc.get_org_group_repoids(org_id, group_id)
    except SearpcError:
        return []

    if not repo_ids:
        return []
    
    repoid_list = []
    for repo_id in repo_ids.split("\n"):
        if repo_id == '':
            continue
        repoid_list.append(repo_id)

    repos = []
    for repo_id in repoid_list:
        if not repo_id:
            continue
        repo = get_repo(repo_id)
        if not repo:
            continue

        repo.owner = seafserv_threaded_rpc.get_org_group_repo_owner(org_id,
                                                                    group_id,
                                                                    repo_id)
        repo.sharecd_from_me = True if user == repo.owner else False

        try:
            repo.latest_modify = get_commits(repo.id, 0, 1)[0].ctime
        except:
            repo.latest_modify = None

        repos.append(repo)
    repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
    
    return repos

def get_org_groups_by_repo(org_id, repo_id):
    try:
        group_ids = seafserv_threaded_rpc.get_org_groups_by_repo(org_id,
                                                                 repo_id)
    except SearpcError:
        group_ids = ''
    if not group_ids:
        return []

    groups = []
    for group_id in group_ids.split('\n'):
        if not group_id:
            continue
        group = get_group(group_id)
        if group:
            groups.append(group)
    return groups
    
# inner pub repo
def list_inner_pub_repos():
    """
    List inner pub repos, which can be access by everyone.
    """
    inner_pub_repos = seafserv_threaded_rpc.list_inner_pub_repos()
    for repo in inner_pub_repos:
        repo.owner = seafserv_threaded_rpc.get_repo_owner(repo.id)

        try:
            repo.latest_modify = get_commits(repo.id, 0, 1)[0].ctime
        except:
            repo.latest_modify = None

    inner_pub_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
    return inner_pub_repos

def is_inner_pub_repo(repo_id):
    """
    Check whether a repo is public.
    Return 0 if repo is not inner public, otherwise non-zero.
    """
    try:
        ret = seafserv_threaded_rpc.is_inner_pub_repo(repo_id)
    except SearpcError:
        ret = 0

    return ret

# org inner pub repo
def list_org_inner_pub_repos(org_id, start=None, limit=None):
    """
    List org inner pub repos, which can be access by all org members.
    """
    try:
        repos = seafserv_threaded_rpc.list_org_inner_pub_repos(org_id)
    except SearpcError:
        repos = []
        
    # calculate repo's lastest modify time
    for repo in repos:
        repo.owner = seafserv_threaded_rpc.get_org_repo_owner(repo.id)
        try:
            repo.latest_modify = get_commits(repo.id, 0, 1)[0].ctime
        except:
            repo.latest_modify = None
    # sort repos by latest modify time
    repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
    return repos

# repo permissoin
def check_permission(repo_id, user):
    """
    Check whether user has permission to access repo.
    Return true if user has permission otherwise false.
    """
    try:
        ret = seafserv_threaded_rpc.check_permission(repo_id, user)
    except SearpcError:
        ret = ""
    return ret

def is_passwd_set(repo_id, user):
    try:
        ret = seafserv_rpc.is_passwd_set(repo_id, user)
    except SearpcError, e:
        ret = -1
    return True if ret == 1 else False

def is_personal_repo(repo_id):
    """
    Check whether repo is personal repo.
    """
    try:
        owner = seafserv_threaded_rpc.get_repo_owner(repo_id)
    except SearpcError:
        owner = ''
    return True if owner else False

def list_personal_shared_repos(user, user_type, start, limit):
    """
    List personal repos that user share with others.
    If `user_type` is 'from_email', list repos user shares to others;
    If `user_type` is 'to_email', list repos others sahre to user.
    """
    try:
        repos = seafserv_threaded_rpc.list_share_repos(user, user_type,
                                                       start, limit)
    except SearpcError:
        repos = []

    p_repos = []
    if repos:
        for r in repos:
            if is_personal_repo(r.id):
                try:
                    r.latest_modify = get_commits(r.id, 0, 1)[0].ctime
                except:
                    r.latest_modify = None
                p_repos.append(r)

    p_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
    return p_repos

def list_org_shared_repos(user, user_type, start, limit):
    """
    List org repos that user share with others.
    If `user_type` is 'from_email', list repos user shares to others;
    If `user_type` is 'to_email', list repos others sahre to user.
    """
    try:
        repos = seafserv_threaded_rpc.list_share_repos(user, user_type,
                                                       start, limit)
    except SearpcError:
        repos = []

    o_repos = []
    if repos:
        for r in repos:
            if not is_personal_repo(r.id):
                try:
                    r.latest_modify = get_commits(r.id, 0, 1)[0].ctime
                except:
                    r.latest_modify = None
                o_repos.append(r)

    o_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
    return o_repos

def is_valid_filename(file_or_dir):
    """
    Check whether file name or directory name is valid.
    """
    try:
        ret = seafserv_threaded_rpc.is_valid_filename('', file_or_dir)
    except SearpcError:
        ret = 0

    return ret

def get_file_size(file_id):
    try:
        fs = seafserv_threaded_rpc.get_file_size(file_id)
    except SearpcError, e:
        fs = 0
    return fs

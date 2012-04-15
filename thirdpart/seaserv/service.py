"""
Peer:
    peer.props.id:           Peer's ID.
    peer.props.name          peer's name
    peer.props.user_id       The ID of the user this peer belong to.
    peer.props.timestamp     Last modification time in milliseconds.
    peer.props.role_list     The roles I give to this peer's user.
    peer.props.myrole_list   This roles this peer's user gives to me.

User:
    user.props.id:           User ID.
    user.props.name:         User Name.
    user.props.timestamp     Last modification time in milliseconds.
    user.props.is_self       True if this is myself.
    user.props.role_list     The roles I give to this user.
    user.props.myrole_list   This roles this user gives to me.
    user.props.default_relay The user's default relay.
    user.props.avatar_url The user's default relay.

Group:
    group.props.id:          Group ID.
    group.props.name:        Group Name.
    group.props.creator:     Creator
    group.props.rendezvous:  The ID of the rendezvous peer.
    group.props.timestamp:   Last modification time.
    group.props.members:     The peer IDs of the group members seperated by ' '.
    group.props.followers:   The peer IDs of the followers.
    group.props.maintainers: The peer IDs of the maintainers.

Message:
    msg.props.id:            Message ID
    msg.props.parent_id      Parent ID
    msg.props.src            The user who sent this message
    msg.props.dest           
    msg.props.is_to_group    True if this is a group message
    msg.props.ctime          Creation time
    msg.props.rtime          Receive time
    msg.props.n_ack          Number of acks
    msg.props.n_reply        Number of replies
    msg.props.content

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

SyncInfo:

    repo_id:
    head_commit:             The head_commit of master branch at seahub
    deleted_on_relay:        True if repo is deleted on relay


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


# This does not connect daemon, used for the web to display
# (name, id) info
cclient = ccnet.Client()

if os.path.exists(CCNET_CONF_PATH):
    cclient.load_confdir(CCNET_CONF_PATH)
    cclient.inited = True
else:
    cclient.inited = False

pool = ccnet.ClientPool(CCNET_CONF_PATH)
ccnet_rpc = ccnet.CcnetRpcClient(pool, req_pool=True)
monitor_rpc = seafile.MonitorRpcClient(pool)
seafserv_rpc = seafile.ServerRpcClient(pool, req_pool=True)
seafserv_threaded_rpc = seafile.ServerThreadedRpcClient(pool, req_pool=True)

user_db = {}

def translate_userid(user_id):
    try:
        user = user_db[user_id]
    except:
        user = ccnet_rpc.get_user(user_id)
        if user:
            user_db[user_id] = user
        else:
            return user_id[:8]
    if user.props.name:
        return user.props.name + "(" + user_id[:4] + ")"
    else:
        return user_id[:8]


def translate_userid_simple(user_id):
    try:
        user = user_db[user_id]
    except:
        user = ccnet_rpc.get_user(user_id)
        if user:
            user_db[user_id] = user
        else:
            return user_id[:8]
    if user.props.name:
        return user.props.name
    else:
        return user_id[:8]


peer_db = {}

def translate_peerid(peer_id):
    try:
        peer = peer_db[peer_id]
    except:
        peer = ccnet_rpc.get_peer(peer_id)
        if peer:
            peer_db[peer_id] = peer
        else:
            return peer_id[:8]
    if peer.props.name:
        return peer.props.name
    else:
        return peer_id[:8]


def translate_peerid_simple(peer_id):
    try:
        peer = peer_db[peer_id]
    except:
        peer = ccnet_rpc.get_peer(peer_id)
        if peer:
            peer_db[peer_id] = peer
        else:
            return peer_id[:8]
    if peer.props.name:
        return peer.props.name
    else:
        return peer_id[:8]


def get_peer_avatar_url(peer_id):
    try:
        peer = peer_db[peer_id]
    except:
        peer = ccnet_rpc.get_peer(peer_id)
        if peer:
            peer_db[peer_id] = peer
        else:
            return None
    try:
        user = user_db[peer.props.user_id]
    except:
        user = ccnet_rpc.get_user(user_id)
        if user:
            user_db[user_id] = user
        else:
            return None
    return user.props.avatar_url

def get_user_avatar_url(user_id):
    try:
        user = user_db[user_id]
    except:
        user = ccnet_rpc.get_user(user_id)
        if user:
            user_db[user_id] = user
        else:
            return None
    return user.props.avatar_url


group_db = {}

def translate_groupid(group_id):
    try:
        group = group_db[group_id]
    except:
        group = ccnet_rpc.get_group(group_id)
        if group:
            group_db[group_id] = group
        else:
            return group_id[:8]
    if group.props.name:
        return group.props.name + "(" + group_id[:4] + ")"
    else:
        return group_id[:8]


def translate_msgtime(msgtime):
    return datetime.fromtimestamp(
        (float(msgtime))/1000000).strftime("%Y-%m-%d %H:%M:%S")

def translate_msgtime2(msgtime):
    return datetime.fromtimestamp(
        (float(msgtime))).strftime("%Y-%m-%d %H:%M:%S")

def translate_time_sec(time):
    return datetime.fromtimestamp(
        (float(time))).strftime("%Y-%m-%d %H:%M:%S")

def translate_time_usec(time):
    return datetime.fromtimestamp(
        (float(time))/1000000).strftime("%Y-%m-%d %H:%M:%S")

    

#### Basic ccnet API ####

def get_peers_by_role(role):
    try:
        peer_ids = ccnet_rpc.get_peers_by_role(role)
    except SearpcError:
        return []

    peers = []
    for peer_id in peer_ids.split("\n"):
        # too handle the ending '\n'
        if peer_id == '':
            continue
        peer = ccnet_rpc.get_peer(peer_id)
        peers.append(peer)
    return peers

def get_peers_by_myrole(myrole):
    try:
        peer_ids = ccnet_rpc.get_peers_by_myrole(myrole)
    except SearpcError:
        return []

    peers = []
    for peer_id in peer_ids.split("\n"):
        # too handle the ending '\n'
        if peer_id == '':
            continue
        peer = ccnet_rpc.get_peer(peer_id)
        peers.append(peer)
    return peers

def get_users():
    user_ids = ccnet_rpc.list_users()
    if not user_ids:
        return []
    users = []
    for user_id in user_ids.split("\n"):
        # too handle the ending '\n'
        if user_id == '':
            continue
        user = ccnet_rpc.get_user(user_id)
        users.append(user)
    return users


def get_user(user_id):
    user = ccnet_rpc.get_user(user_id)
    return user

def get_ccnetuser(username=None, userid=None):
    # Get emailuser from db
    if username != None:
        emailuser = ccnet_rpc.get_emailuser(username)
    if userid != None:
        emailuser = ccnet_rpc.get_emailuser_by_id(userid)
    if emailuser == None:
        return None
    
    # And convert to ccnetuser
    from seahub.base.accounts import convert_to_ccnetuser
    ccnetuser = convert_to_ccnetuser(emailuser)

    return ccnetuser

def get_groups():
    """Get group object list. """
    group_ids = ccnet_rpc.list_groups()
    if not group_ids:
        return []
    groups = []
    for group_id in group_ids.split("\n"):
        # too handle the ending '\n'
        if group_id == '':
            continue
        group = ccnet_rpc.get_group(group_id)
        groups.append(group)
    return groups


def get_group(group_id):
    group = ccnet_rpc.get_group(group_id)
    if not group:
        return None
    group.members = group.props.members.split(" ")
    group.followers = group.props.followers.split(" ")
    group.maintainers = group.props.maintainers.split(" ")
    return group


def get_events(offset, limit):
    events = ccnet_rpc.get_events(offset, limit)
    for event in events:
        if not event.props.body:
            event.detail = ""
        else:
            event.detail = json.loads(event.props.body)
    return events


def count_event():
    return ccnet_rpc.count_event()


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

def get_repo(repo_id):
    return seafserv_threaded_rpc.get_repo(repo_id)

def get_commits(repo_id, offset, limit):
    """Get commit lists."""
    return seafserv_threaded_rpc.get_commit_list(repo_id, offset, limit)

def get_branches(repo_id):
    """Get branches of a given repo"""
    return seafserv_threaded_rpc.branch_gets(repo_id)

def get_binding_userids(email):
    """Get user ids of a given email"""
    try:
        user_ids = ccnet_rpc.get_binding_userids(email)
    except SearpcError:
        return []

    userid_list = []
    for user_id in user_ids.split("\n"):
        if user_id == '':
            continue
        userid_list.append(user_id)
    return userid_list

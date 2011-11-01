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
    head_branch:             The name of the head branch

Branch:
    name:
    commit_id:
    repo_id:

ShareItem:

    id:
    repo_id:
    group_id:
    user_id:
    timestamp:

SyncInfo:

    repo_id:
    head_commit:             The head_commit of master branch at seahub
    deleted_on_relay:        True if repo is deleted on relay


"""


from datetime import datetime
import json
import os
import sys

from pysearpc import SearpcError
import ccnet
import seamsg
import seafile

if sys.platform == 'win32':
    DEFAULT_CCNET_CONF_PATH = "C:\\ccnet"
else:
    DEFAULT_CCNET_CONF_PATH = "~/.ccnet"

if 'CCNET_CONF_DIR' in os.environ:
    CCNET_CONF_PATH = os.environ['CCNET_CONF_DIR']
else:
    CCNET_CONF_PATH = DEFAULT_CCNET_CONF_PATH

CCNET_CONF_PATH = os.path.expanduser(CCNET_CONF_PATH)

# this is not connect daemon, used for the web to display
# (name, id) info
cclient = ccnet.Client()

if os.path.exists(CCNET_CONF_PATH):
    cclient.load_confdir(CCNET_CONF_PATH)
    cclient.inited = True
else:
    cclient.inited = False

pool = ccnet.ClientPool(CCNET_CONF_PATH)
ccnet_rpc = ccnet.CcnetRpcClient(pool)
seamsg_rpc = seamsg.RpcClient(pool)
seafile_rpc = seafile.RpcClient(pool)
monitor_rpc = seafile.MonitorRpcClient(pool)

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
        return peer.props.name + "(" + peer_id[:4] + ")"
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

######## seamsg API #####

def get_message(msgid):
    return seamsg_rpc.get_message_by_id(msgid)


def get_user_messages(user, offset, limit):
    """Get messages sent to or received from `user`.

    For example:
    
        get_user_message('eb812fd276432eff33bcdde7506f896eb4769da0', 0, 10)

    fetches the lastest 10 messages from the given user.

    :param user: user ID.
    :param offset: offset of the first message.
    :param limit: only fetch `limit` messages.
    """
    return seamsg_rpc.get_user_messages(user, offset, limit)


def get_group_messages(group, offset, limit):
    """Get messages of `group`."""
    return seamsg_rpc.get_group_messages(group, offset, limit)


def get_messages(offset, limit):
    """Get messages start at `offset`."""
    return seamsg_rpc.get_messages(offset, limit)

def count_message():
    return seamsg_rpc.count_message()

def count_user_message(user):
    return seamsg_rpc.count_user_message(user)

def count_group_message(group):
    return seamsg_rpc.count_group_message(group)


######## seafile API ####

def get_repos():
    """
    Return repository list.

    """
    return seafile_rpc.get_repo_list("", 100)

def get_repo(repo_id):
    return seafile_rpc.get_repo(repo_id)

def get_repo_sinfo(repo_id):
    return seafile_rpc.get_repo_sinfo(repo_id)

def get_commits(repo_id):
    return seafile_rpc.get_commit_list(repo_id, "", 100)

def get_commit_tree_block_number(commit_id):
    return seafile_rpc.get_commit_tree_block_number(commit_id);

def checkout(repo_id, commit_id):
    return seafile_rpc.checkout(repo_id, commit_id)

def get_upload_task_list():
    return seafile_rpc.get_upload_task_list()

def get_download_task_list():
    return seafile_rpc.get_download_task_list()

def get_branches(repo_id):
    """Get branches of a given repo"""
    return seafile_rpc.branch_gets(repo_id)

def list_share_info():
    return seafile_rpc.list_share_info(0, 100)

def get_repo_status(repo_id):
    status = seafile_rpc.get_repo_status(repo_id)
    lists = ([], [], [], [])
    cnt = 0
    i = 0;
    s = status.split("\n")
    print s
    while cnt < 4:
        if int(s[i]) != 0:
            tmpcnt = int(s[i]) + i
            while i < tmpcnt:
                i = i + 1
                lists[cnt].append(s[i])

        i = i + 1
        cnt = cnt + 1

    return lists


######## ccnet-applet API #####
class CcnetError(Exception):

    def __init__(self, msg):
        self.msg = msg

    def __str__(self):
        return self.msg


def open_dir(path):
     """Call remote service `opendir`."""
     client = pool.get_client()
     req_id = client.get_request_id()
     req = "applet-opendir " + path
     client.send_request(req_id, req)
     if client.read_response() < 0:
         raise NetworkError("Read response error")
     
     rsp = client.response
     pool.return_client(client)
     if rsp[0] != "200":
         raise CcnetError("Error received: %s %s" % (rsp[0], rsp[1]))

from datetime import datetime
import os
import sys

from pysearpc import SearpcError
import ccnet
import seamsg
import seafile

DEFAULT_CCNET_CONF_PATH = "~/.ccnet"


if 'CCNET_CONF_DIR' in os.environ:
    CCNET_CONF_PATH = os.environ['CCNET_CONF_DIR']
else:
    CCNET_CONF_PATH = DEFAULT_CCNET_CONF_PATH

# this is not connect daemon, used for the web to display
# (name, id) info
cclient = ccnet.Client()
cclient.load_confdir(CCNET_CONF_PATH)

pool = ccnet.ClientPool(CCNET_CONF_PATH)
ccnet_rpc = ccnet.CcnetRpcClient(pool)
seamsg_rpc = seamsg.RpcClient(pool)
seafile_rpc = seafile.RpcClient(pool)

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


def get_users():
    user_ids = ccnet_rpc.list_users()
    if not user_ids:
        return []
    users = [ ]
    for user_id in user_ids.split("\n"):
        # too handle the ending '\n'
        if user_id == '':
            continue
        user = ccnet_rpc.get_user(user_id)
        users.append(user)
    return users


def get_user(user_id):
    user = ccnet_rpc.get_user(user_id)
    return group

def get_groups():
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
    group.members = group.props.members.split(" ")
    group.followers = group.props.followers.split(" ")
    return group


def get_repos():
    return seafile_rpc.get_repo_list("", 100)

def get_repo(repo_id):
    return seafile_rpc.get_repo(repo_id)

def get_repo_sinfo(repo_id):
    return seafile_rpc.get_repo_sinfo(repo_id)

def get_commits(repo_id):
    return seafile_rpc.get_commit_list(repo_id, "", 100)

def get_user_upload_info(user_id):
    return seafile_rpc.get_user_upload_info(user_id, 0, 100)

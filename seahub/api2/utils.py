# encoding: utf-8
# Utility functions for api2

import os
import time
import json
import re

from collections import defaultdict
from functools import wraps

from django.core.paginator import EmptyPage, InvalidPage
from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework import status, serializers
from seaserv import seafile_api, get_commits, server_repo_size, \
    get_personal_groups_by_user, is_group_user, get_group, seafserv_threaded_rpc
from pysearpc import SearpcError

from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname, \
    translate_seahub_time, file_icon_filter
from seahub.contacts.models import Contact
from seahub.group.models import GroupMessage, MessageReply, \
    MessageAttachment, PublicGroup
from seahub.group.views import is_group_staff
from seahub.message.models import UserMessage, UserMsgAttachment
from seahub.notifications.models import UserNotification
from seahub.utils import api_convert_desc_link, get_file_type_and_ext, \
    gen_file_get_url
from seahub.utils.paginator import Paginator
from seahub.utils.file_types import IMAGE
from seahub.api2.models import Token, TokenV2, DESKTOP_PLATFORMS


def api_error(code, msg):
    err_resp = {'error_msg': msg}
    return Response(err_resp, status=code)


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

def get_file_size(store_id, repo_version, file_id):
    size = seafile_api.get_file_size(store_id, repo_version, file_id)
    return size if size else 0

def prepare_starred_files(files):
    array = []
    for f in files:
        sfile = {'org' : f.org_id,
                 'repo' : f.repo.id,
                 'repo_name' : f.repo.name,
                 'path' : f.path,
                 'icon_path' : file_icon_filter(f.path),
                 'file_name' : os.path.basename(f.path),
                 'mtime' : f.last_modified,
                 'mtime_relative': translate_seahub_time(f.last_modified),
                 'dir' : f.is_dir
                 }
        if not f.is_dir:
            try:
                file_id = seafile_api.get_file_id_by_path(f.repo.id, f.path)
                sfile['oid'] = file_id
                sfile['size'] = get_file_size(f.repo.store_id, f.repo.version, file_id)
            except SearpcError, e:
                pass

        array.append(sfile)

    return array

def get_groups(email):
    group_json = []

    joined_groups = get_personal_groups_by_user(email)
    grpmsgs = {}
    for g in joined_groups:
        grpmsgs[g.id] = 0

    notes = UserNotification.objects.get_user_notifications(email, seen=False)
    replynum = 0
    for n in notes:
        if n.is_group_msg():
            try:
                gid  = n.group_message_detail_to_dict().get('group_id')
            except UserNotification.InvalidDetailError:
                continue
            if gid not in grpmsgs:
                continue
            grpmsgs[gid] = grpmsgs[gid] + 1
        elif n.is_grpmsg_reply():
            replynum = replynum + 1

    for g in joined_groups:
        msg = GroupMessage.objects.filter(group_id=g.id).order_by('-timestamp')[:1]
        mtime = 0
        if len(msg) >= 1:
            mtime = get_timestamp(msg[0].timestamp)
        group = {
            "id":g.id,
            "name":g.group_name,
            "creator":g.creator_name,
            "ctime":g.timestamp,
            "mtime":mtime,
            "msgnum":grpmsgs[g.id],
            }
        group_json.append(group)

    return group_json, replynum

def get_msg_group_id(msg_id):
    try:
        msg = GroupMessage.objects.get(id=msg_id)
    except GroupMessage.DoesNotExist:
        return None

    return msg.group_id

def get_msg_group_id_and_last_reply(msg_id):
    lastreply = None
    try:
        msg = GroupMessage.objects.get(id=msg_id)
    except GroupMessage.DoesNotExist:
        return None, None

    replies = MessageReply.objects.filter(reply_to=msg).order_by('-timestamp')[:1]
    if len(replies) >= 1:
        lastreply = replies[0].message

    return msg.group_id, lastreply

def get_group_and_contacts(email):
    group_json = []
    contacts_json = []
    replies_json = []
    gmsgnums = {}
    umsgnums = {}
    replies = {}
    gmsgnum = umsgnum = replynum = 0

    contacts = [c.contact_email for c in Contact.objects.filter(user_email=email)]
    joined_groups = get_personal_groups_by_user(email)

    notes = UserNotification.objects.get_user_notifications(email, seen=False)
    for n in notes:
        if n.is_group_msg():
            try:
                gid  = n.group_message_detail_to_dict().get('group_id')
            except UserNotification.InvalidDetailError:
                continue
            gmsgnums[gid] = gmsgnums.get(gid, 0) + 1
        elif n.is_grpmsg_reply():
            d = n.grpmsg_reply_detail_to_dict()
            msg_id = d['msg_id']
            if replies.get(msg_id, None):
                replies[msg_id] = replies[msg_id] + 1
            else:
                replies[msg_id] = 1
                d['mtime'] = get_timestamp(n.timestamp)
                d['name'] = email2nickname(d['reply_from'])
                d['group_id'],  d['lastmsg'] = get_msg_group_id_and_last_reply(msg_id)
                replies_json.append(d)
            replynum = replynum + 1
        elif n.is_user_message():
            msg_from = n.user_message_detail_to_dict()['msg_from']
            if msg_from not in contacts:
                contacts.append(msg_from)
            umsgnums[n.detail] = umsgnums.get(msg_from, 0) + 1

    for r in replies_json:
        r['msgnum'] = replies[r['msg_id']]

    for g in joined_groups:
        msg = GroupMessage.objects.filter(group_id=g.id).order_by('-timestamp')[:1]
        mtime = 0
        lastmsg = None
        if len(msg) >= 1:
            mtime = get_timestamp(msg[0].timestamp)
            lastmsg = msg[0].message
        group = {
            "id":g.id,
            "name":g.group_name,
            "creator":g.creator_name,
            "ctime":g.timestamp,
            "mtime":mtime,
            "lastmsg":lastmsg,
            "msgnum":gmsgnums.get(g.id, 0),
            }

        gmsgnum = gmsgnum + gmsgnums.get(g.id, 0)
        group_json.append(group)

    for contact in contacts:
        msg = UserMessage.objects.get_messages_between_users(
            contact, email).order_by('-timestamp')[:1]
        mtime = 0
        lastmsg = None
        if len(msg) >= 1:
            mtime = get_timestamp(msg[0].timestamp)
            lastmsg = msg[0].message
        c = {
            'email' : contact,
            'name' : email2nickname(contact),
            "mtime" : mtime,
            "lastmsg":lastmsg,
            "msgnum" : umsgnums.get(contact, 0),
            }
        umsgnum = umsgnum + umsgnums.get(contact, 0)
        contacts_json.append(c)
    contacts_json.sort(key=lambda x: x["mtime"], reverse=True)
    return contacts_json, umsgnum, group_json, gmsgnum, replies_json, replynum

def prepare_events(event_groups):
    for g in event_groups:
        for e in g["events"]:
            if e.etype != "repo-delete":
                e.link = "api://repos/%s" % e.repo_id

            if e.etype == "repo-update":
                api_convert_desc_link(e)

def get_group_msgs(groupid, page, username):

    # Show 15 group messages per page.
    paginator = Paginator(GroupMessage.objects.filter(
            group_id=groupid).order_by('-timestamp'), 15)

    # If page request (9999) is out of range, return None
    try:
        group_msgs = paginator.page(page)
    except (EmptyPage, InvalidPage):
        return None

    # Force evaluate queryset to fix some database error for mysql.
    group_msgs.object_list = list(group_msgs.object_list)

    attachments = MessageAttachment.objects.filter(group_message__in=group_msgs.object_list)

    msg_replies = MessageReply.objects.filter(reply_to__in=group_msgs.object_list)
    reply_to_list = [ r.reply_to_id for r in msg_replies ]

    for msg in group_msgs.object_list:
        msg.reply_cnt = reply_to_list.count(msg.id)
        msg.replies = []
        for r in msg_replies:
            if msg.id == r.reply_to_id:
                msg.replies.append(r)
        msg.replies = msg.replies[-3:]

        for att in attachments:
            if att.group_message_id != msg.id:
                continue

            # Attachment name is file name or directory name.
            # If is top directory, use repo name instead.
            path = att.path
            if path == '/':
                repo = seafile_api.get_repo(att.repo_id)
                if not repo:
                    # TODO: what should we do here, tell user the repo
                    # is no longer exists?
                    continue
                att.name = repo.name
            else:
                path = path.rstrip('/') # cut out last '/' if possible
                att.name = os.path.basename(path)

            # Load to discuss page if attachment is a image and from recommend.
            if att.attach_type == 'file' and att.src == 'recommend':
                att.filetype, att.fileext = get_file_type_and_ext(att.name)
                if att.filetype == IMAGE:
                    att.obj_id = seafile_api.get_file_id_by_path(att.repo_id, path)
                    if not att.obj_id:
                        att.err = 'File does not exist'
                    else:
                        att.token = seafile_api.get_fileserver_access_token(
                            att.repo_id, att.obj_id, 'view', username)
                        att.img_url = gen_file_get_url(att.token, att.name)

            msg.attachment = att

    return group_msgs

def get_timestamp(msgtimestamp):
    if not msgtimestamp:
        return 0
    timestamp = int(time.mktime(msgtimestamp.timetuple()))
    return timestamp

def group_msg_to_json(msg, get_all_replies):
    ret = {
        'from_email': msg.from_email,
        'nickname': email2nickname(msg.from_email),
        'timestamp': get_timestamp(msg.timestamp),
        'msg': msg.message,
        'msgid': msg.id,
        }

    atts_json = []
    atts = MessageAttachment.objects.filter(group_message_id=msg.id)
    for att in atts:
        att_json = {
            'path': att.path,
            'repo': att.repo_id,
            'type': att.attach_type,
            'src': att.src,
            }
        atts_json.append(att_json)
    if len(atts_json) > 0:
        ret['atts'] = atts_json

    reply_list = MessageReply.objects.filter(reply_to=msg)
    msg.reply_cnt = reply_list.count()
    if not get_all_replies and msg.reply_cnt > 3:
        msg.replies = reply_list[msg.reply_cnt - 3:]
    else:
        msg.replies = reply_list
    replies = []
    for reply in msg.replies:
        r = {
            'from_email' : reply.from_email,
            'nickname' : email2nickname(reply.from_email),
            'timestamp' : get_timestamp(reply.timestamp),
            'msg' : reply.message,
            'msgid' : reply.id,
            }
        replies.append(r)

    ret['reply_cnt'] = msg.reply_cnt
    ret['replies'] = replies
    return ret

def get_group_msgs_json(groupid, page, username):
    # Show 15 group messages per page.
    paginator = Paginator(GroupMessage.objects.filter(
            group_id=groupid).order_by('-timestamp'), 15)

    # If page request (9999) is out of range, return None
    try:
        group_msgs = paginator.page(page)
    except (EmptyPage, InvalidPage):
        return None, -1

    if group_msgs.has_next():
        next_page = group_msgs.next_page_number()
    else:
        next_page = -1

    group_msgs.object_list = list(group_msgs.object_list)
    msgs = [ group_msg_to_json(msg, True) for msg in group_msgs.object_list ]
    return msgs, next_page

def get_group_message_json(group_id, msg_id, get_all_replies):
    try:
        msg = GroupMessage.objects.get(id=msg_id)
    except GroupMessage.DoesNotExist:
        return None

    if group_id and group_id != msg.group_id:
        return None
    return group_msg_to_json(msg, get_all_replies)

def get_person_msgs(to_email, page, username):

    # Show 15 group messages per page.
    paginator = Paginator(UserMessage.objects.get_messages_between_users(username, to_email).order_by('-timestamp'), 15)

    # If page request (9999) is out of range, return None
    try:
        person_msgs = paginator.page(page)
    except (EmptyPage, InvalidPage):
        return None

    # Force evaluate queryset to fix some database error for mysql.
    person_msgs.object_list = list(person_msgs.object_list)
    attachments = UserMsgAttachment.objects.list_attachments_by_user_msgs(person_msgs.object_list)

    for msg in person_msgs.object_list:
        msg.attachments = []
        for att in attachments:
            if att.user_msg != msg:
                continue

            pfds = att.priv_file_dir_share
            if pfds is None: # in case that this attachment is unshared.
                continue

            att.repo_id = pfds.repo_id
            att.path = pfds.path
            att.name = os.path.basename(pfds.path.rstrip('/'))
            att.token = pfds.token
            msg.attachments.append(att)

    return person_msgs

def get_email(id_or_email):
    try:
        uid = int(id_or_email)
        try:
            user = User.objects.get(id=uid)
        except User.DoesNotExist:
            user = None
        if not user:
            return None
        to_email = user.email
    except ValueError:
        to_email = id_or_email

    return to_email

def api_group_check(func):
    """
    Decorator for initial group permission check tasks

    un-login user & group not pub --> login page
    un-login user & group pub --> view_perm = "pub"
    login user & non group member & group not pub --> public info page
    login user & non group member & group pub --> view_perm = "pub"
    group member --> view_perm = "joined"
    sys admin --> view_perm = "sys_admin"
    """
    def _decorated(view, request, group_id, *args, **kwargs):
        group_id_int = int(group_id) # Checked by URL Conf
        group = get_group(group_id_int)
        if not group:
            return api_error(status.HTTP_404_NOT_FOUND, 'Group not found.')
        group.is_staff = False
        if PublicGroup.objects.filter(group_id=group.id):
            group.is_pub = True
        else:
            group.is_pub = False

        joined = is_group_user(group_id_int, request.user.username)
        if joined:
            group.view_perm = "joined"
            group.is_staff = is_group_staff(group, request.user)
            return func(view, request, group, *args, **kwargs)
        if request.user.is_staff:
            # viewed by system admin
            group.view_perm = "sys_admin"
            return func(view, request, group, *args, **kwargs)

        if group.is_pub:
            group.view_perm = "pub"
            return func(view, request, group, *args, **kwargs)

        # Return group public info page.
        return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this group.')

    return _decorated

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR', '')

    return ip

def get_diff_details(repo_id, commit1, commit2):
    result = defaultdict(list)

    diff_result = seafserv_threaded_rpc.get_diff(repo_id, commit1, commit2)
    if not diff_result:
        return result

    for d in diff_result:
        if d.status == 'add':
            result['added_files'].append(d.name)
        elif d.status == 'del':
            result['deleted_files'].append(d.name)
        elif d.status == 'mov':
            result['renamed_files'].extend((d.name, d.new_name))
        elif d.status == 'mod':
            result['modified_files'].append(d.name)
        elif d.status == 'newdir':
            result['added_dirs'].append(d.name)
        elif d.status == 'deldir':
            result['deleted_dirs'].append(d.name)

    return result

JSON_CONTENT_TYPE = 'application/json; charset=utf-8'
def json_response(func):
    @wraps(func)
    def wrapped(*a, **kw):
        result = func(*a, **kw)
        if isinstance(result, HttpResponse):
            return result
        else:
            return HttpResponse(json.dumps(result), status=200,
                                content_type=JSON_CONTENT_TYPE)
    return wrapped

def get_token_v1(username):
    token, _ = Token.objects.get_or_create(user=username)
    return token

_ANDROID_DEVICE_ID_PATTERN = re.compile('^[a-f0-9]{1,16}$')
def get_token_v2(request, username, platform, device_id, device_name,
                 client_version, platform_version):

    if platform in DESKTOP_PLATFORMS:
        # desktop device id is the peer id, so it must be 40 chars
        if len(device_id) != 40:
            raise serializers.ValidationError('invalid device id')

    elif platform == 'android':
        # See http://developer.android.com/reference/android/provider/Settings.Secure.html#ANDROID_ID
        # android device id is the 64bit secure id, so it must be 16 chars in hex representation
        # but some user reports their device ids are 14 or 15 chars long. So we relax the validation.
        if not _ANDROID_DEVICE_ID_PATTERN.match(device_id.lower()):
            raise serializers.ValidationError('invalid device id')
    elif platform == 'ios':
        if len(device_id) != 36:
            raise serializers.ValidationError('invalid device id')
    else:
        raise serializers.ValidationError('invalid platform')

    return TokenV2.objects.get_or_create_token(
        username, platform, device_id, device_name,
        client_version, platform_version, get_client_ip(request))

def to_python_boolean(string):
    """Convert a string to boolean.
    """
    string = string.lower()
    if string in ('t', 'true', '1'):
        return True
    if string in ('f', 'false', '0'):
        return False
    raise ValueError("Invalid boolean value: '%s'" % string)

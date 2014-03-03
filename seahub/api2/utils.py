# encoding: utf-8
# Utility functions for api2

import time
import urllib2


from rest_framework.response import Response
from seaserv import seafile_api, get_commits, server_repo_size, \
    get_personal_groups_by_user, is_group_user, get_group

from seahub.notifications.models import UserNotification
from seahub.group.models import GroupMessage, MessageReply, \
 MessageAttachment, PublicGroup
from seahub.group.views import is_group_staff
from seahub.message.models import UserMessage, UserMsgAttachment
from seahub.contacts.models import Contact
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils import api_convert_desc_link, get_file_type_and_ext, \
    gen_file_get_url
from seahub.utils.paginator import Paginator
from seahub.utils.file_types import IMAGE


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

def calculate_repo_info(repo_list, username):
    """
    Get some info for repo.

    """
    for repo in repo_list:
        commit = get_commits(repo.id, 0, 1)[0]
        if not commit:
            continue
        repo.latest_modify = commit.ctime
        repo.root = commit.root_id
        repo.size = server_repo_size(repo.id)

def get_file_size (fid):
    size = seafile_api.get_file_size(fid)
    return size if size else 0

def prepare_starred_files(files):
    array = []
    for f in files:
        sfile = {'org' : f.org_id,
                 'repo' : f.repo.id,
                 'path' : f.path,
                 'mtime' : f.last_modified,
                 'dir' : f.is_dir
                 }
        if not f.is_dir:
            try:
                file_id = seafile_api.get_file_id_by_path(f.repo.id, f.path)
                sfile['oid'] = file_id
                sfile['size'] = get_file_size(file_id)
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
    replynum = 0;
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
            mtime = int(time.mktime(msg[0].timestamp.timetuple()))
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

def get_group_and_contacts(email):
    group_json = []
    contacts_json = []
    gmsgnum = umsgnum = replynum = 0

    contacts = [c.contact_email for c in Contact.objects.filter(user_email=email)]
    joined_groups = get_personal_groups_by_user(email)
    gmsgnums = umsgnums = {}

    notes = UserNotification.objects.get_user_notifications(email, seen=False)
    for n in notes:
        if n.is_group_msg():
            try:
                gid  = n.group_message_detail_to_dict().get('group_id')
            except UserNotification.InvalidDetailError:
                continue
            gmsgnums[gid] = gmsgnums.get(gid, 0) + 1
        elif n.is_grpmsg_reply():
            replynum = replynum + 1
        elif n.is_user_message():
            if n.detail not in contacts:
                contacts.append(n.detail)
            umsgnums[n.detail] = umsgnums.get(n.detail, 0) + 1

    for g in joined_groups:
        msg = GroupMessage.objects.filter(group_id=g.id).order_by('-timestamp')[:1]
        mtime = 0
        if len(msg) >= 1:
            mtime = int(time.mktime(msg[0].timestamp.timetuple()))
        group = {
            "id":g.id,
            "name":g.group_name,
            "creator":g.creator_name,
            "ctime":g.timestamp,
            "mtime":mtime,
            "msgnum":gmsgnums.get(g.id, 0),
            }

        gmsgnum = gmsgnum + gmsgnums.get(g.id, 0)
        group_json.append(group)

    for contact in contacts:
        msg = UserMessage.objects.get_messages_related_to_user(
            contact).order_by('-timestamp')[:1]
        mtime = 0
        if len(msg) >= 1:
            mtime = int(time.mktime(msg[0].timestamp.timetuple()))
        c = {
            'email' : contact,
            'name' : email2nickname(contact),
            "msgnum" : umsgnums.get(contact, 0),
            "mtime" : mtime,
            }
        umsgnum = umsgnum + umsgnums.get(contact, 0)
        contacts_json.append(c)
    contacts_json.sort(key=lambda x: x["mtime"], reverse=True)
    return contacts_json, umsgnum, group_json, replynum, gmsgnum

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
                repo = get_repo(att.repo_id)
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
                    att.obj_id = get_file_id_by_path(att.repo_id, path)
                    if not att.obj_id:
                        att.err = 'File does not exist'
                    else:
                        att.token = seafile_api.get_httpserver_access_token(
                            att.repo_id, att.obj_id, 'view', username)
                        att.img_url = gen_file_get_url(att.token, att.name)

            msg.attachment = att

    return group_msgs

def group_msg_to_json(msg, get_all_replies):
    ret = {
        'from_email' : msg.from_email,
        'nickname' : email2nickname(msg.from_email),
        'time' : msg.timestamp,
        'msg' : msg.message,
        }

    try:
        att = MessageAttachment.objects.get(group_message_id=msg.id)
    except MessageAttachment.DoesNotExist:
        att = None

    if att:
        att_json = {
            'path' : att.path,
            'repo' : att.repo_id,
            'type' : att.attach_type,
            'src'  : att.src,
            }
        ret['att'] = att_json

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
            'time' : reply.timestamp,
            'msg' : reply.message,
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
        return None

    if group_msgs.has_next():
        next_page = group_msgs.next_page_number()
    else:
        next_page = -1

    group_msgs.object_list = list(group_msgs.object_list)
    msgs = [ group_msg_to_json(msg, False) for msg in group_msgs.object_list ]
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
        person_msgs = paginator.page(paginator.num_pages)

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

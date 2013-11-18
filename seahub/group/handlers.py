from seahub.group.signals import grpmsg_added
from seahub.group.models import GroupMessage, MessageReply
from seahub.notifications.models import UserNotification

from seaserv import get_group_members

def grpmsg_added_cb(sender, **kwargs):
    group_id = kwargs['group_id']
    from_email = kwargs['from_email']
    group_members = get_group_members(int(group_id))

    notify_members = [ x.user_name for x in group_members if x.user_name != from_email ]
    UserNotification.objects.bulk_add_group_msg_notices(notify_members, group_id)

def grpmsg_reply_added_cb(sender, **kwargs):
    msg_id = kwargs['msg_id']
    reply_from_email = kwargs['from_email']
    try:
        group_msg = GroupMessage.objects.get(id=msg_id)
    except GroupMessage.DoesNotExist:
        group_msg = None

    if group_msg is None:
        return

    msg_replies = MessageReply.objects.filter(reply_to=group_msg)
    notice_users = set([ x.from_email for x in msg_replies \
                             if x.from_email != reply_from_email])

    for user in notice_users:
        try:
            UserNotification.objects.get_group_msg_reply_notice(user, msg_id)
        except UserNotification.DoesNotExist:
            UserNotification.objects.add_group_msg_reply_notice(to_user=user,
                                                                msg_id=msg_id)


from signals import grpmsg_added
from models import GroupMessage
from notifications.models import UserNotification

from seaserv import get_group_members

def grpmsg_added_cb(sender, **kwargs):
    group_id = kwargs['group_id']
    from_email = kwargs['from_email']
    group_members = get_group_members(int(group_id))
    if len(group_members) > 15: # No need to send notification when group is 
        return                  # too large

    for m in group_members:
        if from_email == m.user_name:
            continue
        try:
            UserNotification.objects.get(to_user=m.user_name,
                                         msg_type='group_msg',
                                         detail=group_id)
        except UserNotification.DoesNotExist:
            n = UserNotification(to_user=m.user_name, msg_type='group_msg',
                                 detail=group_id)
            n.save()

def grpmsg_reply_added_cb(sender, **kwargs):
    msg_id = kwargs['msg_id']
    reply_from_email = kwargs['from_email'] # this value may be used in future
    try:
        group_msg = GroupMessage.objects.get(id=msg_id)
    except GroupMessage.DoesNotExist:
        pass

    try:
        UserNotification.objects.get(to_user=group_msg.from_email,
                                     msg_type='grpmsg_reply',
                                     detail=msg_id)
    except UserNotification.DoesNotExist:
        n = UserNotification(to_user=group_msg.from_email,
                             msg_type='grpmsg_reply',
                             detail=msg_id)
        n.save()


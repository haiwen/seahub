from seaserv import ccnet_threaded_rpc

from signals import grpmsg_added
from models import GroupMessage
from seahub.notifications.models import UserNotification

def grpmsg_added_cb(sender, **kwargs):
    group_id = kwargs['group_id']
    from_email = kwargs['from_email']
    group_members = ccnet_threaded_rpc.get_group_members(int(group_id))
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


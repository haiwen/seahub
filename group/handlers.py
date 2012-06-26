from seaserv import ccnet_threaded_rpc

from signals import grpmsg_added
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
            
    

            
            

    

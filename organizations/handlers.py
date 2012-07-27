# encoding: utf-8
from signals import org_user_added
from seahub.notifications.models import UserNotification

from seaserv import get_org_by_id

def org_user_added_cb(sender, **kwargs):
    org_id = kwargs['org_id']
    from_email = kwargs['from_email']
    to_email = kwargs['to_email']
    
    org = get_org_by_id(org_id)
    if not org:
        return
    
    msg = u'%s 将你加入到团体 %s' % (from_email, org.org_name)
    n = UserNotification(to_user=to_email, msg_type='org_msg', detail=msg)
    n.save()

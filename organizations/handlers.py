# encoding: utf-8
import simplejson as json

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
    
    msg_dict = {'from_email': from_email,
                'org_name': org.org_name,
                'org_prefix': org.url_prefix,
                'creator': org.creator}

    n = UserNotification(to_user=to_email, msg_type='org_join_msg',
                         detail=json.dumps(msg_dict))
    n.save()

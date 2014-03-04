# -*- coding: utf-8 -*-
from seahub.group.models import GroupMessage
from seahub.notifications.models import UserNotification, MSG_TYPE_GROUP_MSG

def user_msg_info_list(user_msgs, user):
    """Group message list by ``from_email`` or ``to_email`` and order by
    message time.

    **Returns**

    {
    u'foo@foo.com': {'type': u'user', 'last_msg': u'test', 'not_read': 0, 'last_time': datetime.datetime(2013, 5, 27, 13, 26, 7, 423777)},
    u'bar@bar.com', {'type': u'user', 'last_msg': u'hello', 'not_read': 0, 'last_time': datetime.datetime(2013, 5, 27, 13, 10, 31, 811318)},
    ...
    }

    """
    message = {}

    for msg in user_msgs:
        if (msg.from_email == user): # message user send to others
            if not message.has_key(msg.to_email):
                message.setdefault(msg.to_email,{})
                message[msg.to_email].setdefault('type', 'user')
                message[msg.to_email].setdefault('not_read', 0)
                message[msg.to_email].setdefault('last_msg',msg.message)
                message[msg.to_email].setdefault('last_time',msg.timestamp)
            else:
                if msg.timestamp > message[msg.to_email]['last_time']:
                    message[msg.to_email]['last_time'] = msg.timestamp
                    message[msg.to_email]['last_msg'] = msg.message
                    
        else:                   # message others send to the user
            if not message.has_key(msg.from_email):
                message.setdefault(msg.from_email,{})
                message[msg.from_email].setdefault('type', 'user')
                message[msg.from_email].setdefault('not_read',0) 
                message[msg.from_email].setdefault('last_msg',msg.message) 
                message[msg.from_email].setdefault('last_time',msg.timestamp)
            else:
                if msg.timestamp > message[msg.from_email]['last_time']:
                    message[msg.from_email]['last_time'] = msg.timestamp
                    message[msg.from_email]['last_msg'] = msg.message

            if not msg.ifread:
                message[msg.from_email]['not_read'] += 1


    return message

def group_msg_info_list(joined_groups, username):
    """
    Group message of groups that user joined.

    **Returns**
    {
    u'test_group': {'type': u'group', 'id': 1, 'not_read': 32, 'last_msg': u'hey', 'last_time': datetime.datetime(2013, 5, 27, 13, 12, 31, 343452)},
    ...
    }
    """
    message = {}
    user_notices = UserNotification.objects.filter(to_user=username,
            msg_type=MSG_TYPE_GROUP_MSG)
    for g in joined_groups:
        group_msg = GroupMessage.objects.filter(group_id=g.id).order_by('-timestamp')[:1]
        if len(group_msg) > 0:
            message.setdefault(g.group_name,{})
            message[g.group_name].setdefault('type', 'group')
            message[g.group_name].setdefault('id', g.id)
            message[g.group_name].setdefault('not_read', 0)
            message[g.group_name].setdefault('last_msg', group_msg[0].message)
            message[g.group_name].setdefault('last_time', group_msg[0].timestamp)
            for notice in user_notices:
                gid = notice.group_message_detail_to_dict().get('group_id')
                if gid == g.id:
                    if notice.seen is False:
                        message[g.group_name]['not_read'] += 1

    return message

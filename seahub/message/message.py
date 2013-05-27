# -*- coding: utf-8 -*-

def msg_info_list(msgs, user):
    """Group message list by ``from_email`` or ``to_email`` and order by
    message time. 

    **Returns**

    [
    (u'foo@foo.com', {'last_msg': u'test', 'not_read': 0, 'last_time': datetime.datetime(2013, 5, 27, 13, 26, 7, 423777)}),
    (u'bar@bar.com', {'last_msg': u'hello', 'not_read': 0, 'last_time': datetime.datetime(2013, 5, 27, 13, 10, 31, 811318)}),
    ...
    ]

    """
    message = {}

    for msg in msgs:
        if (msg.from_email == user): # message user send to others
            if not message.has_key(msg.to_email):
                message.setdefault(msg.to_email,{})
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
                message[msg.from_email].setdefault('not_read',0) 
                message[msg.from_email].setdefault('last_msg',msg.message) 
                message[msg.from_email].setdefault('last_time',msg.timestamp)
            else:
                if msg.timestamp > message[msg.from_email]['last_time']:
                    message[msg.from_email]['last_time'] = msg.timestamp
                    message[msg.from_email]['last_msg'] = msg.message

            if not msg.ifread:
                message[msg.from_email]['not_read'] += 1

    sorted_msg = sorted(message.items(), key=lambda x: x[1]['last_time'],
                        reverse=True)

    return sorted_msg

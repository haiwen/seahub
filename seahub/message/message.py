
def msg_info_list(msgs,user):    
    message = {}


    for msg in msgs:
        if (msg.from_email==user): #user send email to to_email
            if not message.has_key(msg.to_email) :
                message.setdefault(msg.to_email,{})
                message[msg.to_email].setdefault('not_read', 0)
                message[msg.to_email].setdefault('last_msg',msg.message)
                message[msg.to_email].setdefault('last_time',msg.timestamp)
            else:
                if msg.timestamp > message[msg.to_email]['last_time']:
                    message[msg.to_email]['last_time'] = msg.timestamp
                    message[msg.to_email]['last_msg'] = msg.message
                    
        else:       #user get email from from_email
            if  not message.has_key(msg.from_email) :
                message.setdefault(msg.from_email,{})
                message[msg.from_email].setdefault('not_read',0) 
                message[msg.from_email].setdefault('last_msg',msg.message) 
                message[msg.from_email].setdefault('last_time',msg.timestamp) 
            else:
                if msg.timestamp > message[msg.from_email]['last_time']:
                    message[msg.from_email]['last_time'] = msg.timestamp
                    message[msg.from_email]['last_msg'] = msg.message

            if  not int(msg.ifread) :

                message[msg.from_email]['not_read'] = message[msg.from_email]['not_read'] + 1
    return message
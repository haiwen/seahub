from signals import *
from handlers import *
from models import GroupMessage, MessageReply

grpmsg_added.connect(grpmsg_added_cb, sender=GroupMessage)
grpmsg_reply_added.connect(grpmsg_reply_added_cb, sender=MessageReply)

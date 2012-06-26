from signals import *
from handlers import *
from models import GroupMessage

grpmsg_added.connect(grpmsg_added_cb, sender=GroupMessage)

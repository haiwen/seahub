# Copyright (c) 2012-2016 Seafile Ltd.
from signals import *
from handlers import *

mail_sended.connect(mail_sended_cb, sender=None)

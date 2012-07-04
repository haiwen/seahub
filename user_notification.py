#!/usr/bin/python
# encoding: utf-8

from datetime import datetime
import string
from django.core.mail import send_mail

from notifications.models import UserNotification
import settings

email_template = u'''${username}您好：

您有${cnt}条新消息，请点击下面的链接查看：
${msg_url}

感谢使用我们的网站！

${site_name}团队
'''

today = datetime.now()
site_name = settings.SITE_NAME
subject = u'%s：新消息' % site_name

site_base = settings.SITE_BASE
if site_base[-1] != '/':
    site_base += '/'
url = site_base + 'home/my/'

notifications = UserNotification.objects.all()

d = {}
for e in notifications:
    if today.year != e.timestamp.year or today.month != e.timestamp.month or \
            today.day != e.timestamp.day:
        continue
    if d.has_key(e.to_user):
        d[e.to_user] += 1
    else:
        d[e.to_user] = 1
    
for k in d.keys():
    to_user = k
    cnt = d[k]
 
    template = string.Template(email_template)
    content = template.substitute(username=to_user, cnt=cnt, msg_url=url, \
                                      site_name=site_name)
    send_mail(subject, content, settings.DEFAULT_FROM_EMAIL, [to_user], \
                   fail_silently=False)
    


from django.conf.urls.defaults import *
from django.core.urlresolvers import reverse 

from views import message_list ,message_send ,msg_list ,msg_count


urlpatterns = patterns("",
    url(r'^list$', message_list, name='message_list'),
    url(r'^message_send/$', message_send, name='message_send'),
    url(r'^msg_list/$', msg_list, name='msg_list'),
    url(r'^msg_count/$', msg_count, name='msg_count'),

)


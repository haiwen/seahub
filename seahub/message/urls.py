from django.conf.urls import patterns, url
from django.views.generic.base import RedirectView

from views import message_list, message_send ,user_msg_list ,msg_count


urlpatterns = patterns("",
    (r'^$', RedirectView.as_view(url='list')),
    url(r'^list/$', message_list, name='message_list'),
    # url(r'^u/(?P<to_email>[^/]+)/$', user_msg_list, name='user_msg_list'),
    url(r'^message_send/$', message_send, name='message_send'),
    url(r'^msg_count/$', msg_count, name='msg_count'),
)

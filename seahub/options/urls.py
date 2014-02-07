from django.conf.urls.defaults import *

from views import *

urlpatterns = patterns("",
    url(r'^save/$', save_options, name='options_save'),
)

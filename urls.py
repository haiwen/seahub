from django.conf.urls.defaults import *
from django.conf import settings
from seahub.views import root, home, peers, groups, myhome, myrepos, \
    repo

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Example:
    # (r'^seahub/', include('seahub.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs' 
    # to INSTALLED_APPS to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    (r'^admin/', include(admin.site.urls)),

    (r'^accounts/', include('registration.backends.default.urls')),

    (r'^$', root),
    (r'^home/$', home),
    (r'^home/my/$', myhome),
    (r'^peers/$', peers),
    (r'^groups/$', groups),
    (r'^repo/(?P<repo_id>[^/]+)/', repo),
    (r'^repos/my/$', myrepos),

    (r'^avatar/', include('avatar.urls')),
    (r'^profile/', include('seahub.profile.urls')),
)

if settings.DEBUG:
    media_url = settings.MEDIA_URL.strip('/')
    urlpatterns += patterns('',
        (r'^%s/(?P<path>.*)$' % (media_url), 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}),
    )

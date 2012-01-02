from django.conf.urls.defaults import *
from django.conf import settings
from django.views.generic.simple import direct_to_template

from seahub.views import root, home, peers, groups, myhome, myrepos, \
    repo, group, group_add_repo, modify_token, remove_repo

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

    (r'^accounts/', include('base.registration_urls')),

    (r'^$', root),
    (r'^home/$', home),
    url(r'^home/my/$', myhome, name='myhome'),
    (r'^help/$', direct_to_template, { 'template': 'help.html' } ),
    (r'^help/sync/$', direct_to_template, { 'template': 'help_sync.html' } ),
    (r'^help/manual/$', direct_to_template, { 'template': 'help_manual.html' } ),
    (r'^help/history/$', direct_to_template, { 'template': 'help_history.html' } ),
    (r'^download/$', direct_to_template, { 'template': 'download.html' } ),
    (r'^peers/$', peers),
    (r'^groups/$', groups),
    url(r'^group/(?P<group_id>[^/]+)/$', group, name='view_group'),
    (r'^group/(?P<group_id>[^/]+)/addrepo/$', group_add_repo),
    (r'^repo/(?P<repo_id>[^/]+)/$', repo),
    (r'^repos/my/$', myrepos),
    (r'^repo/token/modify/(?P<repo_id>[^/]+)/$', modify_token),
    (r'^repo/remove/(?P<repo_id>[^/]+)/$', remove_repo),

    (r'^avatar/', include('avatar.urls')),
    (r'^profile/', include('seahub.profile.urls')),
)

if settings.DEBUG:
    media_url = settings.MEDIA_URL.strip('/')
    urlpatterns += patterns('',
        (r'^%s/(?P<path>.*)$' % (media_url), 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}),
    )

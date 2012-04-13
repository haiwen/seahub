from django.conf.urls.defaults import *
from django.conf import settings
from django.views.generic.simple import direct_to_template

from seahub.views import root, peers, groups, myhome, \
    repo, group, modify_token, remove_repo, seafadmin, useradmin, \
    role_add, role_remove, activate_user, user_add, user_remove, \
    ownerhome, remove_fetched_repo, user_info

# Uncomment the next two lines to enable the admin:
#from django.contrib import admin
#admin.autodiscover()

urlpatterns = patterns('',
    # Example:
    # (r'^seahub/', include('seahub.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs' 
    # to INSTALLED_APPS to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    #(r'^admin/', include(admin.site.urls)),

    (r'^accounts/', include('base.registration_urls')),

    (r'^$', root),
    url(r'^home/my/$', myhome, name='myhome'),
    url(r'^home/owner/(?P<owner_name>[^/]+)/$', ownerhome, name='ownerhome'),
    (r'^download/$', direct_to_template, { 'template': 'download.html' } ),
    (r'^repo/(?P<repo_id>[^/]+)/$', repo),
    (r'^repo/token/modify/(?P<repo_id>[^/]+)/$', modify_token),
    (r'^repo/remove/(?P<repo_id>[^/]+)/$', remove_repo),
    (r'^repo/removefetched/(?P<username>[^/]+)/(?P<repo_id>[^/]+)/$', remove_fetched_repo),

    (r'^seafadmin/$', seafadmin),
    url(r'^useradmin/$', useradmin, name='useradmin'),
    (r'^useradmin/add/$', user_add),
    (r'^useradmin/info/(?P<email>[^/]+)/$', user_info),
    (r'^useradmin/(?P<user_id>[^/]+)/role/add/$', role_add),
    (r'^useradmin/(?P<user_id>[^/]+)/role/remove/$', role_remove),
    (r'^useradmin/(?P<user_id>[^/]+)/user/remove/$', user_remove),
    (r'^useradmin/activate/(?P<user_id>[^/]+)/$', activate_user),
#    (r'^avatar/', include('avatar.urls')),
    (r'^profile/', include('seahub.profile.urls')),

    (r'^contacts/', include('contacts.urls')),
    (r'^share/', include('share.urls')),
)

if settings.DEBUG:
    media_url = settings.MEDIA_URL.strip('/')
    urlpatterns += patterns('',
        (r'^%s/(?P<path>.*)$' % (media_url), 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}),
    )

from django.conf.urls import patterns, url

from views import *

urlpatterns = patterns('',
    url(r'^$', list_shared_repos, name='share_admin'),
    url(r'^links/$', list_shared_links, name='list_shared_links'),
    url(r'^folders/$', list_priv_shared_folders, name='list_priv_shared_folders'),

    url(r'^add/$', share_repo, name='share_repo'),
    url(r'^remove/$', repo_remove_share, name='repo_remove_share'),

    url(r'^ajax/link/remove/$', ajax_remove_shared_link, name='ajax_remove_shared_link'),

    url(r'^link/send/$', send_shared_link, name='send_shared_link'),
    url(r'^link/save/$', save_shared_link, name='save_shared_link'),

    url(r'^ajax/upload_link/remove/$', ajax_remove_shared_upload_link, name='ajax_remove_shared_upload_link'),
    url(r'^upload_link/send/$', send_shared_upload_link, name='send_shared_upload_link'),

    url(r'^permission_admin/$', share_permission_admin, name='share_permission_admin'),


    # url('^remove/(?P<token>[^/]{24,24})/$', remove_anonymous_share, name='remove_anonymous_share'),
    # url('^(?P<token>[^/]{24})/$', anonymous_share_confirm, name='anonymous_share_confirm'),

    url(r'^ajax/repo_remove_share/$', ajax_repo_remove_share, name='ajax_repo_remove_share'),
    url(r'^ajax/get-download-link/$', ajax_get_download_link, name='ajax_get_download_link'),
    url(r'^ajax/get-upload-link/$', ajax_get_upload_link, name='ajax_get_upload_link'),
    url(r'^ajax/private-share-dir/$', ajax_private_share_dir, name='ajax_private_share_dir'),
)

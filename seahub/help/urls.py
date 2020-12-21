# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url, include
from django.views.generic import TemplateView

urlpatterns = [
    url(r'^$', TemplateView.as_view(template_name="help/introduction.html")),
    url(r'^introduction/$', TemplateView.as_view(template_name="help/introduction.html")),

    url(r'^libraries_managing/$', TemplateView.as_view(template_name="help/libraries_managing.html")),
    url(r'^restoring_deleted_files/$', TemplateView.as_view(template_name="help/restoring_deleted_files.html")),
    url(r'^finding_older_version_files/$', TemplateView.as_view(template_name="help/finding_older_version_files.html")),
    url(r'^library_history_and_snapshots/$', TemplateView.as_view(template_name="help/library_history_and_snapshots.html")),
    url(r'^setting_library_history/$', TemplateView.as_view(template_name="help/setting_library_history.html")),
    url(r'^deleting_a_library/$', TemplateView.as_view(template_name="help/deleting_a_library.html")),
    url(r'^viewing_files_within_web_app/$', TemplateView.as_view(template_name="help/viewing_files_within_web_app.html")),
    url(r'^full_text_file_search/$', TemplateView.as_view(template_name="help/full_text_file_search.html")),

    url(r'^sharing_files_and_folders/$', TemplateView.as_view(template_name="help/sharing_files_and_folders.html")),
    url(r'^groups_managing/$', TemplateView.as_view(template_name="help/groups_managing.html")),
    url(r'^file_locking/$', TemplateView.as_view(template_name="help/file_locking.html")),
    url(r'^folder_permission/$', TemplateView.as_view(template_name="help/folder_permission.html")),
    url(r'^departments/$', TemplateView.as_view(template_name="help/departments.html")),

    url(r'^manage_library_as_wiki/$', TemplateView.as_view(template_name="help/manage_library_as_wiki.html") ),

    url(r'^install_sync/$', TemplateView.as_view(template_name="help/install_sync.html") ),
    url(r'^syncing_existing_folders/$', TemplateView.as_view(template_name="help/syncing_existing_folders.html") ),
    url(r'^selective_sync/$', TemplateView.as_view(template_name="help/selective_sync.html") ),
    url(r'^read-only_syncing/$', TemplateView.as_view(template_name="help/read-only_syncing.html") ),
    url(r'^unsync_resync/$', TemplateView.as_view(template_name="help/unsync_resync.html") ),
    url(r'^sync_interval/$', TemplateView.as_view(template_name="help/sync_interval.html") ),
    url(r'^desktop_proxy/$', TemplateView.as_view(template_name="help/desktop_proxy.html") ),
    url(r'^conflicts/$', TemplateView.as_view(template_name="help/conflicts.html") ),
    url(r'^ignore/$', TemplateView.as_view(template_name="help/ignore.html") ),
    url(r'^install_linux_client/$', TemplateView.as_view(template_name="help/install_linux_client.html") ),
    url(r'^linux_cli/$', TemplateView.as_view(template_name="help/linux_cli.html") ),

    url(r'^using_drive_client/$', TemplateView.as_view(template_name="help/using_drive_client.html") ),
    url(r'^drive_client_2.0_for_windows_10/$', TemplateView.as_view(template_name="help/drive_client_2.0_for_windows_10.html") ),
    url(r'^drive_client_for_linux/$', TemplateView.as_view(template_name="help/drive_client_for_linux.html") ),

    url(r'^encrypted_libraries/$', TemplateView.as_view(template_name="help/encrypted_libraries.html") ),
]

# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('', TemplateView.as_view(template_name="help/introduction.html")),
    path('introduction/', TemplateView.as_view(template_name="help/introduction.html")),

    path('libraries_managing/', TemplateView.as_view(template_name="help/libraries_managing.html")),
    path('restoring_deleted_files/', TemplateView.as_view(template_name="help/restoring_deleted_files.html")),
    path('finding_older_version_files/', TemplateView.as_view(template_name="help/finding_older_version_files.html")),
    path('library_history_and_snapshots/', TemplateView.as_view(template_name="help/library_history_and_snapshots.html")),
    path('setting_library_history/', TemplateView.as_view(template_name="help/setting_library_history.html")),
    path('deleting_a_library/', TemplateView.as_view(template_name="help/deleting_a_library.html")),
    path('viewing_files_within_web_app/', TemplateView.as_view(template_name="help/viewing_files_within_web_app.html")),
    path('full_text_file_search/', TemplateView.as_view(template_name="help/full_text_file_search.html")),

    path('sharing_files_and_folders/', TemplateView.as_view(template_name="help/sharing_files_and_folders.html")),
    path('groups_managing/', TemplateView.as_view(template_name="help/groups_managing.html")),
    path('file_locking/', TemplateView.as_view(template_name="help/file_locking.html")),
    path('folder_permission/', TemplateView.as_view(template_name="help/folder_permission.html")),
    path('departments/', TemplateView.as_view(template_name="help/departments.html")),

    path('manage_library_as_wiki/', TemplateView.as_view(template_name="help/manage_library_as_wiki.html") ),

    path('install_sync/', TemplateView.as_view(template_name="help/install_sync.html") ),
    path('syncing_existing_folders/', TemplateView.as_view(template_name="help/syncing_existing_folders.html") ),
    path('selective_sync/', TemplateView.as_view(template_name="help/selective_sync.html") ),
    path('read-only_syncing/', TemplateView.as_view(template_name="help/read-only_syncing.html") ),
    path('unsync_resync/', TemplateView.as_view(template_name="help/unsync_resync.html") ),
    path('sync_interval/', TemplateView.as_view(template_name="help/sync_interval.html") ),
    path('desktop_proxy/', TemplateView.as_view(template_name="help/desktop_proxy.html") ),
    path('conflicts/', TemplateView.as_view(template_name="help/conflicts.html") ),
    path('ignore/', TemplateView.as_view(template_name="help/ignore.html") ),

    path('using_drive_client/', TemplateView.as_view(template_name="help/using_drive_client.html") ),
    re_path(r'^drive_client_2.0_for_windows_10/$', TemplateView.as_view(template_name="help/drive_client_2.0_for_windows_10.html") ),

    path('encrypted_libraries/', TemplateView.as_view(template_name="help/encrypted_libraries.html") ),
]

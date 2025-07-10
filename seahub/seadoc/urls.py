from django.urls import re_path
from .apis import SeadocAccessToken, SeadocUploadLink, SeadocDownloadLink, SeadocImageDownloadLink, SeadocOriginFileContent, SeadocUploadFile, \
    SeadocUploadImage, SeadocDownloadImage, SeadocAsyncCopyImages, SeadocQueryCopyMoveProgressView, SeadocCopyHistoryFile, SeadocHistory, \
    SeadocCommentsView, SeadocCommentView, SeadocStartRevise, SeadocPublishRevision, SeadocRevisionsCount, SeadocRevisions, \
    SeadocCommentRepliesView, SeadocCommentReplyView, SeadocFileView, SeadocFileUUIDView, SeadocDirView, SdocRevisionBaseVersionContent, SeadocRevisionView, \
    SdocRepoTagsView, SdocRepoTagView, SdocRepoFileTagsView, SdocRepoFileTagView, SeadocNotificationsView, SeadocNotificationView, \
    SeadocFilesInfoView, DeleteSeadocOtherRevision, SeadocPublishedRevisionContent, SdocParticipantsView, SdocParticipantView, SdocRelatedUsers, SeadocEditorCallBack, \
    SeadocDailyHistoryDetail, SeadocSearchFilenameView, SeadocExportView, SdocImportView, SeadocUploadVideo, SeadocDownloadVideo, SeadocToPDFDownloadImage


# api/v2.1/seadoc/
urlpatterns = [
    re_path(r'^access-token/(?P<repo_id>[-0-9a-f]{36})/$', SeadocAccessToken.as_view(), name='seadoc_access_token'),
    re_path(r'^upload-file/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadFile.as_view(), name='seadoc_upload_file'),
    re_path(r'^upload-link/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadLink.as_view(), name='seadoc_upload_link'),
    re_path(r'^download-link/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocDownloadLink.as_view(), name='seadoc_download_link'),
    re_path(r'^image-download-link/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocImageDownloadLink.as_view(), name='seadoc_image_download_link'),
    re_path(r'^upload-image/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadImage.as_view(), name='seadoc_upload_image'),
    re_path(r'^upload-video/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadVideo.as_view(), name='seadoc_upload_video'),
    re_path(r'^download-image/(?P<file_uuid>[-0-9a-f]{36})/(?P<filename>.*)$', SeadocDownloadImage.as_view(), name='seadoc_download_image'),
    re_path(r'^download-video/(?P<file_uuid>[-0-9a-f]{36})/(?P<filename>.*)$', SeadocDownloadVideo.as_view(), name='seadoc_download_video'),
    re_path(r'^pdf-download-image/(?P<file_uuid>[-0-9a-f]{36})/(?P<filename>.*)$', SeadocToPDFDownloadImage.as_view(), name='seadoc_to_pdf_download_image'),
    re_path(r'^async-copy-images/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocAsyncCopyImages.as_view(), name='seadoc_async_copy_images'),
    re_path(r'^query-copy-move-progress/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocQueryCopyMoveProgressView.as_view(), name='seadoc_query_copy_move_progress'),
    re_path(r'^copy-history-file/(?P<repo_id>[-0-9a-f]{36})/$', SeadocCopyHistoryFile.as_view(), name='seadoc_copy_history_file'),
    re_path(r'^history/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocHistory.as_view(), name='seadoc_history'),
    re_path(r'^daily-history-detail/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocDailyHistoryDetail.as_view(), name='seadoc_daily_history_detail'),
    re_path(r'^comments/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocCommentsView.as_view(), name='seadoc_comments'),
    re_path(r'^comment/(?P<file_uuid>[-0-9a-f]{36})/(?P<comment_id>\d+)/$', SeadocCommentView.as_view(), name='seadoc_comment'),
    re_path(r'^comment/(?P<file_uuid>[-0-9a-f]{36})/(?P<comment_id>\d+)/replies/$', SeadocCommentRepliesView.as_view(), name='seadoc_comment_replies'),
    re_path(r'^comment/(?P<file_uuid>[-0-9a-f]{36})/(?P<comment_id>\d+)/replies/(?P<reply_id>\d+)/$', SeadocCommentReplyView.as_view(), name='seadoc_comment_reply'),
    re_path(r'^repo-tags/(?P<file_uuid>[-0-9a-f]{36})/$', SdocRepoTagsView.as_view(), name='seadoc_repo_tags'),
    re_path(r'^repo-tags/(?P<file_uuid>[-0-9a-f]{36})/(?P<repo_tag_id>\d+)/$', SdocRepoTagView.as_view(), name='seadoc_repo_tag'),
    re_path(r'^file-tags/(?P<file_uuid>[-0-9a-f]{36})/$', SdocRepoFileTagsView.as_view(), name='seadoc_file_tags'),
    re_path(r'^file-tags/(?P<file_uuid>[-0-9a-f]{36})/(?P<file_tag_id>\d+)/$', SdocRepoFileTagView.as_view(), name='seadoc_file_tag'),
    re_path(r'^start-revise/$', SeadocStartRevise.as_view(), name='seadoc_start_revise'),
    re_path(r'^publish-revision/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocPublishRevision.as_view(), name='seadoc_publish_revision'),
    re_path(r'^revisions-count/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocRevisionsCount.as_view(), name='seadoc_revisions_count'),
    re_path(r'^revisions/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocRevisions.as_view(), name='seadoc_revisions'),
    re_path(r'^revision/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocRevisionView.as_view(), name='seadoc_revision'),
    re_path(r'^revision/base-version-content/(?P<file_uuid>[-0-9a-f]{36})/$', SdocRevisionBaseVersionContent.as_view(), name='sdoc_revision_base_version_content'),
    re_path(r'^revision/origin-file-content/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocOriginFileContent.as_view(), name='sdoc_revision_origin_file_content'),
    re_path(r'^revision/published-content/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocPublishedRevisionContent.as_view(), name='sdoc_published_revision_content'),
    re_path(r'^delete-revision/(?P<file_uuid>[-0-9a-f]{36})/(?P<revision_id>\d+)/$', DeleteSeadocOtherRevision.as_view(), name='sdoc_delete_other_revision'),
    re_path(r'^file/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocFileView.as_view(), name='seadoc_file_view'),
    re_path(r'^file-uuid/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocFileUUIDView.as_view(), name='seadoc_file_uuid_view'),
    re_path(r'^files-info/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocFilesInfoView.as_view(), name='seadoc_files_info_view'),
    re_path(r'^dir/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocDirView.as_view(), name='seadoc_dir_view'),
    re_path(r'^participants/(?P<file_uuid>[-0-9a-f]{36})/$', SdocParticipantsView.as_view(), name='seadoc_participants_view'),
    re_path(r'^participant/(?P<file_uuid>[-0-9a-f]{36})/$', SdocParticipantView.as_view(), name='seadoc_participant_view'),
    re_path(r'^related-users/(?P<file_uuid>[-0-9a-f]{36})/$', SdocRelatedUsers.as_view(), name='seadoc_related_users_view'),
    re_path(r'^editor-status-callback/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocEditorCallBack.as_view(), name='seadoc_editor_callback'),
    re_path(r'^notifications/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocNotificationsView.as_view(), name='seadoc_notifications'),
    re_path(r'^notifications/(?P<file_uuid>[-0-9a-f]{36})/(?P<notification_id>\d+)/$', SeadocNotificationView.as_view(), name='seadoc_notification'),
    re_path(r'^search-filename/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocSearchFilenameView.as_view(), name='seadoc_search_filename'),
    re_path(r'^export/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocExportView.as_view(), name='seadoc_export'),
    re_path(r'^import/(?P<repo_id>[-0-9a-f]{36})/$', SdocImportView.as_view(), name='seadoc_import'),
]

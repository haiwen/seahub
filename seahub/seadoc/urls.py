from django.urls import re_path
from .apis import SeadocAccessToken, SeadocUploadLink, SeadocDownloadLink, SeadocRevisionDownloadLinks, SeadocUploadFile, \
    SeadocUploadImage, SeadocDownloadImage, SeadocCopyHistoryFile, SeadocHistory, SeadocDrafts, SeadocMaskAsDraft, \
    SeadocCommentsView, SeadocCommentView, SeadocStartRevise, SeadocPublishRevision, SeadocRevisionsCount, SeadocRevisions, \
    SeadocCommentRepliesView, SeadocCommentReplyView, SeadocFileView, SeadocFileUUIDView, SeadocDirView


# api/v2.1/seadoc/
urlpatterns = [
    re_path(r'^access-token/(?P<repo_id>[-0-9a-f]{36})/$', SeadocAccessToken.as_view(), name='seadoc_access_token'),
    re_path(r'^upload-file/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadFile.as_view(), name='seadoc_upload_file'),
    re_path(r'^upload-link/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadLink.as_view(), name='seadoc_upload_link'),
    re_path(r'^download-link/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocDownloadLink.as_view(), name='seadoc_download_link'),
    re_path(r'^revision/download-links/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocRevisionDownloadLinks.as_view(), name='seadoc_revision_download_links'),
    re_path(r'^upload-image/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadImage.as_view(), name='seadoc_upload_image'),
    re_path(r'^download-image/(?P<file_uuid>[-0-9a-f]{36})/(?P<filename>.*)$', SeadocDownloadImage.as_view(), name='seadoc_download_image'),
    re_path(r'^copy-history-file/(?P<repo_id>[-0-9a-f]{36})/$', SeadocCopyHistoryFile.as_view(), name='seadoc_copy_history_file'),
    re_path(r'^history/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocHistory.as_view(), name='seadoc_history'),
    re_path(r'^drafts/$', SeadocDrafts.as_view(), name='seadoc_drafts'),
    re_path(r'^mark-as-draft/(?P<repo_id>[-0-9a-f]{36})/$', SeadocMaskAsDraft.as_view(), name='seadoc_mark_as_draft'),
    re_path(r'^comments/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocCommentsView.as_view(), name='seadoc_comments'),
    re_path(r'^comment/(?P<file_uuid>[-0-9a-f]{36})/(?P<comment_id>\d+)/$', SeadocCommentView.as_view(), name='seadoc_comment'),
    re_path(r'^comment/(?P<file_uuid>[-0-9a-f]{36})/(?P<comment_id>\d+)/replies/$', SeadocCommentRepliesView.as_view(), name='seadoc_comment_replies'),
    re_path(r'^comment/(?P<file_uuid>[-0-9a-f]{36})/(?P<comment_id>\d+)/replies/(?P<reply_id>\d+)/$', SeadocCommentReplyView.as_view(), name='seadoc_comment_reply'),
    re_path(r'^start-revise/$', SeadocStartRevise.as_view(), name='seadoc_start_revise'),
    re_path(r'^publish-revision/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocPublishRevision.as_view(), name='seadoc_publish_revision'),
    re_path(r'^revisions-count/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocRevisionsCount.as_view(), name='seadoc_revisions_count'),
    re_path(r'^revisions/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocRevisions.as_view(), name='seadoc_revisions'),
    re_path(r'^file/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocFileView.as_view(), name='seadoc_file_view'),
    re_path(r'^file-uuid/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocFileUUIDView.as_view(), name='seadoc_file_uuid_view'),
    re_path(r'^dir/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocDirView.as_view(), name='seadoc_dir_view'),
]

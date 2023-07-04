from django.urls import re_path
from .apis import SeadocAccessToken, SeadocUploadLink, SeadocDownloadLink, SeadocUploadFile, \
    SeadocUploadImage, SeadocDownloadImage, SeadocCopyHistoryFile, SeadocHistory, SeadocDrafts, SeadocMaskAsDraft, \
    SeadocCommentsView, SeadocCommentView

urlpatterns = [
    re_path(r'^access-token/(?P<repo_id>[-0-9a-f]{36})/$', SeadocAccessToken.as_view(), name='seadoc_access_token'),
    re_path(r'^upload-file/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadFile.as_view(), name='seadoc_upload_file'),
    re_path(r'^upload-link/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadLink.as_view(), name='seadoc_upload_link'),
    re_path(r'^download-link/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocDownloadLink.as_view(), name='seadoc_download_link'),
    re_path(r'^upload-image/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadImage.as_view(), name='seadoc_upload_image'),
    re_path(r'^download-image/(?P<file_uuid>[-0-9a-f]{36})/(?P<filename>.*)$', SeadocDownloadImage.as_view(), name='seadoc_download_image'),
    re_path(r'^copy-history-file/(?P<repo_id>[-0-9a-f]{36})/$', SeadocCopyHistoryFile.as_view(), name='seadoc_copy_history_file'),
    re_path(r'^history/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocHistory.as_view(), name='seadoc_history'),
    re_path(r'^drafts/(?P<repo_id>[-0-9a-f]{36})/$', SeadocDrafts.as_view(), name='seadoc_drafts'),
    re_path(r'^mask-as-draft/(?P<repo_id>[-0-9a-f]{36})/$', SeadocMaskAsDraft.as_view(), name='seadoc_mask_as_draft'),
    re_path(r'^comments/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocCommentsView.as_view(), name='seadoc_comments'),
    re_path(r'^comment/(?P<file_uuid>[-0-9a-f]{36})/(?P<comment_id>\d+)/$', SeadocCommentView.as_view(), name='seadoc_comment'),
]

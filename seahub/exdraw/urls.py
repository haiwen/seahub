from django.urls import re_path
from .apis import ExdrawAccessToken, ExdrawDownloadLink, ExdrawUploadFile, ExdrawEditorCallBack


urlpatterns = [
    re_path(r'^access-token/(?P<repo_id>[-0-9a-f]{36})/$', ExdrawAccessToken.as_view(), name='exdraw_access_token'),
    re_path(r'^upload-file/(?P<file_uuid>[-0-9a-f]{36})/$', ExdrawUploadFile.as_view(), name='exdraw_upload_file'),
    re_path(r'^download-link/(?P<file_uuid>[-0-9a-f]{36})/$', ExdrawDownloadLink.as_view(), name='exdraw_download_link'),
    re_path(r'^editor-status-callback/(?P<file_uuid>[-0-9a-f]{36})/$', ExdrawEditorCallBack.as_view(), name='exdraw_editor_callback'),
]

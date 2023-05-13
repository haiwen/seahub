from django.conf.urls import url
from .apis import SeadocAccessToken, SeadocUploadLink, SeadocDownloadLink, SeadocUploadFile, \
    SeadocUploadImage, SeadocDownloadImage

urlpatterns = [
    url(r'^access-token/(?P<repo_id>[-0-9a-f]{36})/$', SeadocAccessToken.as_view(), name='seadoc_access_token'),
    url(r'^upload-file/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadFile.as_view(), name='seadoc_upload_file'),
    url(r'^upload-link/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadLink.as_view(), name='seadoc_upload_link'),
    url(r'^download-link/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocDownloadLink.as_view(), name='seadoc_download_link'),
    url(r'^upload-image/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadImage.as_view(), name='seadoc_upload_image'),
    url(r'^download-image/(?P<file_uuid>[-0-9a-f]{36})/(?P<filename>.*)$', SeadocDownloadImage.as_view(), name='seadoc_download_image'),
]

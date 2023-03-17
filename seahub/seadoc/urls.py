from django.conf.urls import url
from .apis import SeadocUploadLink, SeadocDownloadLink

urlpatterns = [
    url(r'^upload-link/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocUploadLink.as_view(), name='seadoc_upload_link'),
    url(r'^download-link/(?P<file_uuid>[-0-9a-f]{36})/$', SeadocDownloadLink.as_view(), name='seadoc_download_link'),
]

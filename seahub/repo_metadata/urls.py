from django.urls import re_path
from .apis import MetadataRecords, MetadataManage, MetadataColumns, MetadataRecordInfo, \
    MetadataViews, MetadataViewsMoveView, MetadataViewsDetailView, MetadataViewsDuplicateView, FacesRecords, \
    FaceRecognitionManage, FacesRecord, MetadataExtractFileDetails, PeoplePhotos, MetadataTagsStatusManage, MetadataTags, \
    MetadataFileTags, MetadataTagFiles

urlpatterns = [
    re_path(r'^$', MetadataManage.as_view(), name='api-v2.1-metadata'),
    re_path(r'^records/$', MetadataRecords.as_view(), name='api-v2.1-metadata-records'),
    re_path(r'^record/$', MetadataRecordInfo.as_view(), name='api-v2.1-metadata-record-info'),
    re_path(r'^columns/$', MetadataColumns.as_view(), name='api-v2.1-metadata-columns'),
    re_path(r'^views/$', MetadataViews.as_view(), name='api-v2.1-metadata-views'),
    re_path(r'^views/(?P<view_id>[-0-9a-zA-Z]{4})/$', MetadataViewsDetailView.as_view(), name='api-v2.1-metadata-views-detail'),
    re_path(r'^move-views/$', MetadataViewsMoveView.as_view(), name='api-v2.1-metadata-views-move'),
    re_path(r'^duplicate-view/$', MetadataViewsDuplicateView.as_view(), name='api-v2.1-metadata-view-duplicate'),
    re_path(r'^face-record/$', FacesRecord.as_view(), name='api-v2.1-metadata-face-record'),
    re_path(r'^face-records/$', FacesRecords.as_view(), name='api-v2.1-metadata-face-records'),
    re_path(r'^people-photos/(?P<people_id>.+)/$', PeoplePhotos.as_view(), name='api-v2.1-metadata-people-photos'),
    re_path(r'^face-recognition/$', FaceRecognitionManage.as_view(), name='api-v2.1-metadata-face-recognition'),
    re_path(r'^extract-file-details/$', MetadataExtractFileDetails.as_view(), name='api-v2.1-metadata-extract-file-details'),

    # tags api
    re_path(r'^tags-status/$', MetadataTagsStatusManage.as_view(), name='api-v2.1-metadata-tags-status'),
    re_path(r'^tags/$', MetadataTags.as_view(), name='api-v2.1-metadata-tags'),
    re_path(r'^file-tags/$', MetadataFileTags.as_view(), name='api-v2.1-metadata-file-tags'),
    re_path(r'^tag-files/(?P<tag_id>.+)/$', MetadataTagFiles.as_view(), name='api-v2.1-metadata-tag-files'),
  ]

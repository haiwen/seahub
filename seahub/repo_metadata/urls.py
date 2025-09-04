from django.urls import re_path
from .apis import MetadataRecognizeFaces, MetadataRecords, MetadataManage, MetadataColumns, MetadataRecord, \
    MetadataFolders, MetadataViews, MetadataViewsMoveView, MetadataViewsDetailView, MetadataViewsDuplicateView, FacesRecords, \
    FaceRecognitionManage, FacesRecord, MetadataExtractFileDetails, PeoplePhotos, MetadataTagsStatusManage, MetadataTags, \
    MetadataTagsLinks, MetadataFileTags, MetadataTagFiles, MetadataMergeTags, MetadataTagsFiles, MetadataDetailsSettingsView, \
    PeopleCoverPhoto, MetadataMigrateTags, MetadataExportTags, MetadataImportTags, MetadataGlobalHiddenColumnsView, \
    MetadataBatchRecords, MetadataStatistics

urlpatterns = [
    re_path(r'^$', MetadataManage.as_view(), name='api-v2.1-metadata'),
    re_path(r'^records/$', MetadataRecords.as_view(), name='api-v2.1-metadata-records'),
    re_path(r'^record/$', MetadataRecord.as_view(), name='api-v2.1-metadata-record-info'),
    re_path(r'^batch-records/$', MetadataBatchRecords.as_view(), name='api-v2.1-metadata-batch-records'),
    re_path(r'^columns/$', MetadataColumns.as_view(), name='api-v2.1-metadata-columns'),

    # view
    re_path(r'^folders/$', MetadataFolders.as_view(), name='api-v2.1-metadata-folders'),
    re_path(r'^views/$', MetadataViews.as_view(), name='api-v2.1-metadata-views'),
    re_path(r'^views/(?P<view_id>.+)/$', MetadataViewsDetailView.as_view(), name='api-v2.1-metadata-views-detail'),
    re_path(r'^move-views/$', MetadataViewsMoveView.as_view(), name='api-v2.1-metadata-views-move'),
    re_path(r'^duplicate-view/$', MetadataViewsDuplicateView.as_view(), name='api-v2.1-metadata-view-duplicate'),

    # face-recognition
    re_path(r'^face-record/$', FacesRecord.as_view(), name='api-v2.1-metadata-face-record'),
    re_path(r'^face-records/$', FacesRecords.as_view(), name='api-v2.1-metadata-face-records'),
    re_path(r'^people-photos/(?P<people_id>.+)/$', PeoplePhotos.as_view(), name='api-v2.1-metadata-people-photos-get-delete'),
    re_path(r'^people-photos/$', PeoplePhotos.as_view(), name='api-v2.1-metadata-people-photos-post'),
    re_path(r'^face-recognition/$', FaceRecognitionManage.as_view(), name='api-v2.1-metadata-face-recognition'),
    re_path(r'^recognize-faces/$', MetadataRecognizeFaces.as_view(), name='api-v2.1-metadata-recognize-faces'),
    re_path(r'^people-cover-photo/(?P<people_id>.+)/$', PeopleCoverPhoto.as_view(), name='api-v2.1-metadata-people-cover-photo'),

    re_path(r'^extract-file-details/$', MetadataExtractFileDetails.as_view(), name='api-v2.1-metadata-extract-file-details'),

    # details settings
    re_path(r'^details-settings/', MetadataDetailsSettingsView.as_view(), name='api-v2.1-metadata-details-settings'),

    # global hidden columns
    re_path(r'^global-hidden-columns/$', MetadataGlobalHiddenColumnsView.as_view(), name='api-v2.1-metadata-global-hidden-columns'),

    # tags api
    re_path(r'^tags-status/$', MetadataTagsStatusManage.as_view(), name='api-v2.1-metadata-tags-status'),
    re_path(r'^tags/$', MetadataTags.as_view(), name='api-v2.1-metadata-tags'),
    re_path(r'^tags-links/$', MetadataTagsLinks.as_view(), name='api-v2.1-metadata-tags-links'),
    re_path(r'^file-tags/$', MetadataFileTags.as_view(), name='api-v2.1-metadata-file-tags'),
    re_path(r'^tag-files/(?P<tag_id>.+)/$', MetadataTagFiles.as_view(), name='api-v2.1-metadata-tag-files'),
    re_path(r'^merge-tags/$', MetadataMergeTags.as_view(), name='api-v2.1-metadata-merge-tags'),
    re_path(r'^tags-files/$', MetadataTagsFiles.as_view(), name='api-v2.1-metadata-tags-files'),
    re_path(r'^migrate-tags/$', MetadataMigrateTags.as_view(), name='api-v2.1-metadata-migrate-tags'),
    re_path(r'^export-tags/$', MetadataExportTags.as_view(), name='api-v2.1-metadata-export-tags'),
    re_path(r'^import-tags/$', MetadataImportTags.as_view(), name='api-v2.1-metadata-import-tags'),

    # statistics api
    re_path(r'^statistics/$', MetadataStatistics.as_view(), name='api-v2.1-metadata-statistics'),
]

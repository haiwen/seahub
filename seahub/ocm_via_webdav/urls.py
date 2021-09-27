from django.urls import path

from seahub.views import react_fake_view
from seahub.ocm_via_webdav.ocm_api import SharesView, ReceivedSharesView, \
        ReceivedShareView, DownloadReceivedFileView, NotificationsView

urlpatterns = [

    path(r'', react_fake_view, name="ocm_via_webdav"),

    path('shares', SharesView.as_view(), name='ocm-via-webdav-shares'),
    path('notifications', NotificationsView.as_view(), name='ocm-via-webdav-notifications'),

    path('received-shares/', ReceivedSharesView.as_view(), name='ocm-via-webdav-received-shares'),
    path('received-shares/<int:share_id>/', ReceivedShareView.as_view(), name='ocm-via-webdav-received-share'),
    path('download-received-file/', DownloadReceivedFileView.as_view(), name='ocm-via-webdav-download-received-file'),
]

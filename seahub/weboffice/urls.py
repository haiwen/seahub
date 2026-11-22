# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from .views import WebofficeFileInfoView, WebofficeFileSaveView, WebofficeUserInfoView, \
        WebofficeNotDeployedView

urlpatterns = [
    # RESTful API
    path('v1/3rd/file/info', WebofficeFileInfoView.as_view(), name='WebofficeFileInfoView'),
    path('v1/3rd/file/save', WebofficeFileSaveView.as_view(), name='WebofficeFileSaveView'),
    path('v1/3rd/user/info', WebofficeUserInfoView.as_view(), name='WebofficeUserInfoView'),

    path('v1/3rd/file/rename', WebofficeNotDeployedView.as_view(), name='WebofficeFileRenameView'),
    path('v1/3rd/file/online', WebofficeNotDeployedView.as_view(), name='WebofficeFileOnlineView'),
    path('v1/3rd/file/history', WebofficeNotDeployedView.as_view(), name='WebofficeFileHistoryView'),
    path('v1/3rd/file/version/<int:version>', WebofficeNotDeployedView.as_view(), name='WebofficeFileVersionView'),
    path('v1/3rd/onnotify', WebofficeNotDeployedView.as_view(), name='WebofficeOnnotifyView'),

]

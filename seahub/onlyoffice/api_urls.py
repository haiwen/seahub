# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from seahub.onlyoffice.views import OnlyofficeConvert
from seahub.onlyoffice.views import OnlyofficeFileHistory
from seahub.onlyoffice.views import OnlyofficeGetHistoryFileAccessToken

urlpatterns = [
    path('convert/', OnlyofficeConvert.as_view(), name='onlyoffice_api_convert'),
    path('file-history/', OnlyofficeFileHistory.as_view(), name='onlyoffice_api_file_history'),
    path('get-history-file-access-token/',
         OnlyofficeGetHistoryFileAccessToken.as_view(),
         name='onlyoffice_api_get_history_file_access_token'),
]

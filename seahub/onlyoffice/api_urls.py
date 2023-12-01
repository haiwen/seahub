# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from seahub.onlyoffice.views import OnlyofficeConvert
from seahub.onlyoffice.views import OnlyofficeFileHistory
from seahub.onlyoffice.views import OnlyofficeGenJwtToken

urlpatterns = [
    path('convert/', OnlyofficeConvert.as_view(), name='onlyoffice_api_convert'),
    path('file-history/', OnlyofficeFileHistory.as_view(), name='onlyoffice_api_file_history'),
    path('gen-jwt-token/', OnlyofficeGenJwtToken.as_view(), name='onlyoffice_api_gen_jwt_token'),
]

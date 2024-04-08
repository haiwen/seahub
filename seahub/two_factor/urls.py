# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path
from seahub.two_factor.views import (BackupTokensView, SetupCompleteView,
                                     ProfileView, SetupView, QRGeneratorView,
                                     TwoFactorVerifyView, DisableView)

urlpatterns = [
    # path(regex=r'^$',
    #     view=ProfileView.as_view(),
    #     name='profile', ),
    path('setup/', view=SetupView.as_view(), name='setup', ),
    path('qrcode/', view=QRGeneratorView.as_view(), name='qr', ),
    path('setup/complete/', view=SetupCompleteView.as_view(), name='setup_complete', ),
    path('backup/tokens/', view=BackupTokensView.as_view(), name='backup_tokens', ),
    path('disable/', view=DisableView.as_view(), name='disable', ),
    path('verify/', view=TwoFactorVerifyView.as_view(), name='verify', ),
]

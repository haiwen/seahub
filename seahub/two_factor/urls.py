# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url
from seahub.two_factor.views import (BackupTokensView, SetupCompleteView,
                                     ProfileView, SetupView, QRGeneratorView,
                                     TwoFactorVerifyView, DisableView)

urlpatterns = [
    # url(regex=r'^$',
    #     view=ProfileView.as_view(),
    #     name='profile', ),
    url(regex=r'^setup/$',
        view=SetupView.as_view(),
        name='setup', ),
    url(regex=r'^qrcode$',
        view=QRGeneratorView.as_view(),
        name='qr', ),
    url(regex=r'^setup/complete/$',
        view=SetupCompleteView.as_view(),
        name='setup_complete', ),
    url(regex=r'^backup/tokens/$',
        view=BackupTokensView.as_view(),
        name='backup_tokens', ),
    url(regex=r'^disable/$',
        view=DisableView.as_view(),
        name='disable', ),
    url(regex=r'verify/^$',
        view=TwoFactorVerifyView.as_view(),
        name='verify', ),
]

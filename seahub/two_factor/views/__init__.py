# Copyright (c) 2012-2016 Seafile Ltd.
from .core import SetupView, BackupTokensView, SetupCompleteView, QRGeneratorView
from .mixins import OTPRequiredMixin
from .profile import ProfileView, DisableView
from .login import TwoFactorVerifyView

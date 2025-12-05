# Copyright (c) 2012-2016 Seafile Ltd.
from .core import SetupView, BackupTokensView, SetupCompleteView, QRGeneratorView
from .mixins import OTPRequiredMixin
from .login import TwoFactorVerifyView

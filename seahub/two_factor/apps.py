# Copyright (c) 2012-2016 Seafile Ltd.
from django.apps import AppConfig
from django.conf import settings


class TwoFactorConfig(AppConfig):
    name = 'seahub.two_factor'
    verbose_name = "Django Two Factor Authentication"

    def ready(self):
        pass

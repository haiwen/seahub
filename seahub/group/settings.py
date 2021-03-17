# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings

GROUP_MEMBERS_DEFAULT_DISPLAY = getattr(settings, 'GROUP_MEMBERS_DEFAULT_DISPLAY', 10)
GROUP_IMPORT_MEMBERS_EXTRA_MSG = getattr(settings, 'GROUP_IMPORT_MEMBERS_EXTRA_MSG', '')

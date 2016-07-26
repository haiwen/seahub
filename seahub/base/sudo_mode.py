# Copyright (c) 2012-2016 Seafile Ltd.
"""Ask the admin to provide his password before visiting sysadmin-only pages.

When an admin visist to the syadmin related pages, seahub would ask him to
confirm his/her password to ensure security. The admin only need to provide
the password once for several hours.

See https://help.github.com/articles/sudo-mode/ for an introduction to
github's sudo mode.
"""

import time
from seahub.auth.signals import user_logged_in
from seahub.settings import ENABLE_SUDO_MODE

_SUDO_EXPIRE_SECONDS = 2 * 3600 # 2 hours
_SUDO_MODE_SESSION_KEY = 'sudo_expire_ts'


def sudo_mode_check(request):
    return request.session.get(_SUDO_MODE_SESSION_KEY, 0) > time.time()

def update_sudo_mode_ts(request):
    request.session[_SUDO_MODE_SESSION_KEY] = time.time() + _SUDO_EXPIRE_SECONDS

def update_sudo_ts_when_login(**kwargs):
    request = kwargs['request']
    if request.user.is_staff and not getattr(request, 'client_token_login', False):
        update_sudo_mode_ts(request)

if ENABLE_SUDO_MODE:
    user_logged_in.connect(update_sudo_ts_when_login)

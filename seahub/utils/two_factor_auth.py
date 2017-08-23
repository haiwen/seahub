# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
from constance import config

from seahub.two_factor.views.login import (
    two_factor_auth_enabled, handle_two_factor_auth, verify_two_factor_token,
)

def has_two_factor_auth():
    """Global setting to control enable/disable two factor auth.
    """
    return config.ENABLE_TWO_FACTOR_AUTH

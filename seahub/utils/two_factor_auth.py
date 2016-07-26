# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
from constance import config

try:
    from seahub_extra.two_factor.views.login import (
        two_factor_auth_enabled,
        handle_two_factor_auth,
        verify_two_factor_token,
    )
    HAS_TWO_FACTOR_AUTH = True
except ImportError:
    two_factor_auth_enabled = lambda *a: False
    handle_two_factor_auth = None
    verify_two_factor_token = None
    HAS_TWO_FACTOR_AUTH = False


def has_two_factor_auth():
    return HAS_TWO_FACTOR_AUTH and config.ENABLE_TWO_FACTOR_AUTH

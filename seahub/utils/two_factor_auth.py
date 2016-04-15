# encoding: utf-8

try:
    from seahub_extra.two_factor.views.login import two_factor_auth_enabled, handle_two_factor_auth
    HAS_TWO_FACTOR_AUTH = True
except ImportError:
    two_factor_auth_enabled = lambda *a: False
    handle_two_factor_auth = None
    HAS_TWO_FACTOR_AUTH = False

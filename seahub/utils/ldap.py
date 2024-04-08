# Copyright (c) 2012-2016 Seafile Ltd.
from seahub.settings import ENABLE_LDAP

def get_ldap_info():
    """Get LDAP config from seahub_settings.py.
    """
    return ENABLE_LDAP

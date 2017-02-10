# Copyright (c) 2012-2016 Seafile Ltd.
import seaserv

def get_ldap_info():
    """Get LDAP config from ccnet.conf.
    """
    try:
        return seaserv.LDAP_HOST
    except AttributeError:
        return False

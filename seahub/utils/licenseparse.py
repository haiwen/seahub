import os
import logging
from StringIO import StringIO
from ConfigParser import ConfigParser

logger = logging.getLogger(__name__)

_lic = None

class SeafileLicenseInfo(object):
    def __init__(self, max_users, expiration, lic_type):
        self.max_users = max_users
        self.expiration = expiration
        self.lic_type = lic_type

    def is_enterprise_edition(self):
        return self.lic_type == 'Enterprise Edition'

    @staticmethod
    def instance():
        global _lic
        if _lic is None:
            _lic = SeafileLicenseInfo.from_file('../seafile-license.txt')
        return _lic

    @classmethod
    def from_file(cls, fpath):
        if not os.path.exists(fpath):
            return None
        cp = ConfigParser()
        with open(fpath, 'r') as fp:
            content = fp.read()

        content = '[license]\r\n' + content
        cp.readfp(StringIO(content))

        get = lambda key: cp.get('license', key).strip('"')

        max_users = get('MaxUsers')
        expiration = get('Expiration')
        lic_type = get('Licencetype')

        return cls(max_users, expiration, lic_type)

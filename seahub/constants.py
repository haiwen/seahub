# Copyright (c) 2012-2016 Seafile Ltd.
# Default user have common operations, like creating group and library.
DEFAULT_USER = 'default'

# Guest user have limited operations, can not create group and library.
GUEST_USER = 'guest'

# Permissions
PERMISSION_READ = 'r'
PERMISSION_READ_WRITE = 'rw'
PERMISSION_ADMIN = 'admin'

DEFAULT_ADMIN = 'default_admin'
SYSTEM_ADMIN = 'system_admin'
DAILY_ADMIN = 'daily_admin'
AUDIT_ADMIN = 'audit_admin'

HASH_URLS = {
        'VIEW_COMMON_LIB_DIR': u'/#common/lib/%(repo_id)s/%(path)s',
        'GROUP_INFO': u'/#group/%(group_id)s/',
        'GROUP_MEMBERS': u'/#group/%(group_id)s/members/',
        'GROUP_DISCUSS': u'/#group/%(group_id)s/discussions/',
        'GROUP_LIST': u'/#groups/',
        'SYS_REPO_ADMIN': u'/sysadmin/#all-libs/',

        }

# Copyright (c) 2012-2016 Seafile Ltd.
import seahub.settings as settings
# Default user have common operations, like creating group and library.
DEFAULT_USER = 'default'

# Guest user have limited operations, can not create group and library.
GUEST_USER = 'guest'

# Repo/folder permissions
PERMISSION_PREVIEW = 'preview'  # preview only on the web, can not be downloaded
PERMISSION_PREVIEW_EDIT = 'cloud-edit'  # preview only with edit on the web
PERMISSION_READ = 'r'
PERMISSION_READ_WRITE = 'rw'
PERMISSION_ADMIN = 'admin'

DEFAULT_ADMIN = 'default_admin'
SYSTEM_ADMIN = 'system_admin'
DAILY_ADMIN = 'daily_admin'
AUDIT_ADMIN = 'audit_admin'

HASH_URLS = {
        'VIEW_COMMON_LIB_DIR': settings.SITE_ROOT + '#common/lib/%(repo_id)s/%(path)s',
        'GROUP_INFO': settings.SITE_ROOT + '#group/%(group_id)s/',
        'GROUP_MEMBERS': settings.SITE_ROOT + '#group/%(group_id)s/members/',
        'GROUP_DISCUSS': settings.SITE_ROOT + '#group/%(group_id)s/discussions/',
        'GROUP_LIST': settings.SITE_ROOT + '#groups/',
        'SYS_REPO_ADMIN': settings.SITE_ROOT + 'sysadmin/#all-libs/',

        }

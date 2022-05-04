# Copyright (c) 2012-2016 Seafile Ltd.
import seahub.settings as settings
# Default user have common operations, like creating group and library.
DEFAULT_USER = 'default'

# Guest user have limited operations, can not create group and library.
GUEST_USER = 'guest'

# Repo status
REPO_STATUS_NORMAL = 'normal'
REPO_STATUS_READ_ONLY = 'read-only'

# Repo/folder permissions
PERMISSION_PREVIEW = 'preview'  # preview only on the web, can not be downloaded
PERMISSION_PREVIEW_EDIT = 'cloud-edit'  # preview only with edit on the web
PERMISSION_READ = 'r'
PERMISSION_READ_WRITE = 'rw'
PERMISSION_ADMIN = 'admin'
CUSTOM_PERMISSION_PREFIX = 'custom'

DEFAULT_ADMIN = 'default_admin'
SYSTEM_ADMIN = 'system_admin'
DAILY_ADMIN = 'daily_admin'
AUDIT_ADMIN = 'audit_admin'

DEFAULT_ORG = 'default'

HASH_URLS = {
        'GROUP_MEMBERS': settings.SITE_ROOT + '#group/%(group_id)s/members/',
        'GROUP_DISCUSS': settings.SITE_ROOT + '#group/%(group_id)s/discussions/',
        'SYS_REPO_ADMIN': settings.SITE_ROOT + 'sysadmin/#all-libs/',
        }

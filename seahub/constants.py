# Copyright (c) 2012-2016 Seafile Ltd.
import seahub.settings as settings
from seahub.utils.metadata_server_api import structure_table, structure_column
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
PERMISSION_INVISIBLE = 'invisible'
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


#metadata base
METADATA_TABLE = structure_table('0001', 'Table1')
METADATA_COLUMN_ID = structure_column('0', '_id', 'text')
METADATA_COLUMN_CREATOR = structure_column('16', 'creator', 'text')
METADATA_COLUMN_CREATED_TIME = structure_column('17', 'created_time', 'date')
METADATA_COLUMN_MODIFIER = structure_column('18', 'modifier', 'text')
METADATA_COLUMN_MODIFIED_TIME = structure_column('19', 'modified_time', 'date')
METADATA_COLUMN_PARENT_DIR = structure_column('20', 'parent_dir', 'text')
METADATA_COLUMN_NAME = structure_column('21', 'name', 'text')
METADATA_COLUMN_IS_DIR = structure_column('22', 'is_dir', 'text')

REPO_SHARE_LINK_COUNT_LIMIT = 500000

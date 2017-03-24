# Copyright (c) 2012-2016 Seafile Ltd.
"""
A set of request processors that return dictionaries to be merged into a
template context. Each function takes the request object as its only parameter
and returns a dictionary to add to the context.

These are referenced from the setting TEMPLATE_CONTEXT_PROCESSORS and used by
RequestContext.
"""

import re

from django.conf import settings as dj_settings
from constance import config

from seahub.settings import SEAFILE_VERSION, SITE_TITLE, SITE_NAME, \
    MAX_FILE_NAME, BRANDING_CSS, LOGO_PATH, LOGO_WIDTH, LOGO_HEIGHT,\
    SHOW_REPO_DOWNLOAD_BUTTON, SITE_ROOT, ENABLE_GUEST_INVITATION

try:
    from seahub.settings import SEACLOUD_MODE
except ImportError:
    SEACLOUD_MODE = False

from seahub.utils import HAS_FILE_SEARCH, EVENTS_ENABLED, TRAFFIC_STATS_ENABLED, \
        is_pro_version

try:
    from seahub.settings import ENABLE_PUBFILE
except ImportError:
    ENABLE_PUBFILE = False
try:
    from seahub.settings import ENABLE_SYSADMIN_EXTRA
except ImportError:
    ENABLE_SYSADMIN_EXTRA = False

try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False

def base(request):
    """
    Add seahub base configure to the context.

    """
    try:
        org = request.user.org
    except AttributeError:
        org = None

    # extra repo id from request path, use in search
    repo_id_patt = r".*/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})/.*"
    m = re.match(repo_id_patt, request.get_full_path())
    search_repo_id = m.group(1) if m is not None else None
    file_server_root = config.FILE_SERVER_ROOT
    if not file_server_root.endswith('/'):
        file_server_root += '/'

    return {
        'seafile_version': SEAFILE_VERSION,
        'site_title': SITE_TITLE,
        'branding_css': BRANDING_CSS,
        'logo_path': LOGO_PATH,
        'logo_width': LOGO_WIDTH,
        'logo_height': LOGO_HEIGHT,
        'seacloud_mode': SEACLOUD_MODE,
        'cloud_mode': request.cloud_mode,
        'org': org,
        'site_name': SITE_NAME,
        'enable_signup': config.ENABLE_SIGNUP,
        'max_file_name': MAX_FILE_NAME,
        'has_file_search': HAS_FILE_SEARCH,
        'enable_pubfile': ENABLE_PUBFILE,
        'show_repo_download_button': SHOW_REPO_DOWNLOAD_BUTTON,
        'share_link_password_min_length': config.SHARE_LINK_PASSWORD_MIN_LENGTH,
        'repo_password_min_length': config.REPO_PASSWORD_MIN_LENGTH,
        'events_enabled': EVENTS_ENABLED,
        'traffic_stats_enabled': TRAFFIC_STATS_ENABLED,
        'sysadmin_extra_enabled': ENABLE_SYSADMIN_EXTRA,
        'multi_tenancy': MULTI_TENANCY,
        'multi_institution': getattr(dj_settings, 'MULTI_INSTITUTION', False),
        'search_repo_id': search_repo_id,
        'SITE_ROOT': SITE_ROOT,
        'constance_enabled': dj_settings.CONSTANCE_ENABLED,
        'FILE_SERVER_ROOT': file_server_root,
        'enable_guest_invitation': ENABLE_GUEST_INVITATION,
        'enable_terms_and_conditions': dj_settings.ENABLE_TERMS_AND_CONDITIONS,
        'is_pro': True if is_pro_version() else False,
        }

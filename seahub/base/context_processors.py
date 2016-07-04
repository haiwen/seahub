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
    SHOW_REPO_DOWNLOAD_BUTTON, SITE_ROOT

try:
    from seahub.settings import SEACLOUD_MODE
except ImportError:
    SEACLOUD_MODE = False

from seahub.utils import HAS_FILE_SEARCH, EVENTS_ENABLED, TRAFFIC_STATS_ENABLED

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
    try:
        base_template = request.base_template
    except AttributeError:
        base_template = 'base.html'

    try:
        grps = request.user.joined_groups
        grps.sort(lambda x, y: cmp(x.group_name.lower(), y.group_name.lower()))
    except AttributeError:      # anonymous user
        grps = None

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
        'base_template': base_template,
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
        'grps': grps,
        'multi_tenancy': MULTI_TENANCY,
        'multi_institution': getattr(dj_settings, 'MULTI_INSTITUTION', False),
        'search_repo_id': search_repo_id,
        'SITE_ROOT': SITE_ROOT,
        'constance_enabled': dj_settings.CONSTANCE_ENABLED,
        'FILE_SERVER_ROOT': file_server_root,
        }

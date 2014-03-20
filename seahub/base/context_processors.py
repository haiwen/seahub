"""
A set of request processors that return dictionaries to be merged into a
template context. Each function takes the request object as its only parameter
and returns a dictionary to add to the context.

These are referenced from the setting TEMPLATE_CONTEXT_PROCESSORS and used by
RequestContext.
"""
from seahub.settings import SEAFILE_VERSION, SITE_TITLE, SITE_NAME, SITE_BASE, \
    ENABLE_SIGNUP, MAX_FILE_NAME, BRANDING_CSS, LOGO_PATH, LOGO_WIDTH, LOGO_HEIGHT,\
    SHOW_REPO_DOWNLOAD_BUTTON, REPO_PASSWORD_MIN_LENGTH

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
        base_template = 'myhome_base.html'

    username = request.user.username

    # get 8 user groups
    try:
        grps = request.user.joined_groups[:8]
    except AttributeError:      # anonymous user
        grps = None

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
        'enable_signup': ENABLE_SIGNUP,
        'max_file_name': MAX_FILE_NAME,
        'has_file_search': HAS_FILE_SEARCH,
        'enable_pubfile': ENABLE_PUBFILE,
        'show_repo_download_button': SHOW_REPO_DOWNLOAD_BUTTON,
        'repo_password_min_length': REPO_PASSWORD_MIN_LENGTH,
        'events_enabled': EVENTS_ENABLED,
        'traffic_stats_enabled': TRAFFIC_STATS_ENABLED,
        'sysadmin_extra_enabled': ENABLE_SYSADMIN_EXTRA,
        'grps': grps,
        }

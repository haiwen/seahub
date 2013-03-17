"""
A set of request processors that return dictionaries to be merged into a
template context. Each function takes the request object as its only parameter
and returns a dictionary to add to the context.

These are referenced from the setting TEMPLATE_CONTEXT_PROCESSORS and used by
RequestContext.
"""
from seahub.settings import SEAFILE_VERSION, SITE_TITLE, SITE_NAME, SITE_BASE, \
    ENABLE_SIGNUP, MAX_FILE_NAME, BRANDING_CSS, LOGO_PATH, LOGO_URL
try:
    from seahub.settings import BUSINESS_MODE
except ImportError:
    BUSINESS_MODE = False
try:
    from seahub.settings import SEACLOUD_MODE
except ImportError:
    SEACLOUD_MODE = False

from seahub.utils import HAS_FILE_SEARCH

try:
    from seahub.settings import ENABLE_PUBFILE
except ImportError:
    ENABLE_PUBFILE = False

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

    return {
        'seafile_version': SEAFILE_VERSION,
        'site_title': SITE_TITLE,
        'branding_css': BRANDING_CSS,
        'logo_path': LOGO_PATH,
        'logo_url': LOGO_URL,
        'business_mode': BUSINESS_MODE,
        'seacloud_mode': SEACLOUD_MODE,
        'cloud_mode': request.cloud_mode,
        'org': org,
        'base_template': base_template,
        'site_name': SITE_NAME,
        'enable_signup': ENABLE_SIGNUP,
        'max_file_name': MAX_FILE_NAME,
        'has_file_search': HAS_FILE_SEARCH,
        'enable_pubfile': ENABLE_PUBFILE,
        }


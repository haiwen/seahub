# Copyright (c) 2012-2016 Seafile Ltd.
"""
A set of request processors that return dictionaries to be merged into a
template context. Each function takes the request object as its only parameter
and returns a dictionary to add to the context.

These are referenced from the setting TEMPLATE_CONTEXT_PROCESSORS and used by
RequestContext.
"""

import re
import os

from django.conf import settings as dj_settings
from django.utils.functional import lazy
from constance import config

from seahub.settings import SEAFILE_VERSION, SITE_TITLE, SITE_NAME, \
    MAX_FILE_NAME, LOGO_PATH, BRANDING_CSS, LOGO_WIDTH, LOGO_HEIGHT,\
    SHOW_REPO_DOWNLOAD_BUTTON, SITE_ROOT, ENABLE_GUEST_INVITATION, \
    FAVICON_PATH, ENABLE_THUMBNAIL, THUMBNAIL_SIZE_FOR_ORIGINAL, \
    MEDIA_ROOT, SHOW_LOGOUT_ICON, CUSTOM_LOGO_PATH, CUSTOM_FAVICON_PATH

from seahub.constants import DEFAULT_ADMIN
from seahub.utils import get_site_name

try:
    from seahub.settings import SEACLOUD_MODE
except ImportError:
    SEACLOUD_MODE = False

from seahub.utils import HAS_FILE_SEARCH, EVENTS_ENABLED, \
        TRAFFIC_STATS_ENABLED, is_pro_version

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

    logo_path = LOGO_PATH
    favicon_path = FAVICON_PATH

    # filter ajax/api request out
    if (not request.is_ajax()) and ("api2/" not in request.path) and \
            ("api/v2.1/" not in request.path):

        # get logo path
        custom_logo_file = os.path.join(MEDIA_ROOT, CUSTOM_LOGO_PATH)
        if os.path.exists(custom_logo_file):
            logo_path = CUSTOM_LOGO_PATH

        # get favicon path
        custom_favicon_file = os.path.join(MEDIA_ROOT, CUSTOM_FAVICON_PATH)
        if os.path.exists(custom_favicon_file):
            favicon_path = CUSTOM_FAVICON_PATH

    result = {
        'seafile_version': SEAFILE_VERSION,
        'site_title': config.SITE_TITLE,
        'branding_css': BRANDING_CSS,
        'enable_branding_css': config.ENABLE_BRANDING_CSS,
        'favicon_path': favicon_path,
        'logo_path': logo_path,
        'logo_width': LOGO_WIDTH,
        'logo_height': LOGO_HEIGHT,
        'seacloud_mode': SEACLOUD_MODE,
        'cloud_mode': request.cloud_mode,
        'org': org,
        'site_name': get_site_name(),
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
        'CSRF_COOKIE_NAME': dj_settings.CSRF_COOKIE_NAME,
        'constance_enabled': dj_settings.CONSTANCE_ENABLED,
        'FILE_SERVER_ROOT': file_server_root,
        'LOGIN_URL': dj_settings.LOGIN_URL,
        'enable_thumbnail': ENABLE_THUMBNAIL,
        'thumbnail_size_for_original': THUMBNAIL_SIZE_FOR_ORIGINAL,
        'enable_guest_invitation': ENABLE_GUEST_INVITATION,
        'enable_terms_and_conditions': config.ENABLE_TERMS_AND_CONDITIONS,
        'show_logout_icon': SHOW_LOGOUT_ICON,
        'is_pro': True if is_pro_version() else False,
        'enable_repo_wiki_mode': dj_settings.ENABLE_REPO_WIKI_MODE,
    }

    if request.user.is_staff:
        result['is_default_admin'] = request.user.admin_role == DEFAULT_ADMIN

    return result

def debug(request):
    """
    Returns context variables helpful for debugging.
    """
    context_extras = {}
    if dj_settings.DEBUG and request.META.get('REMOTE_ADDR') in dj_settings.INTERNAL_IPS or \
       dj_settings.DEBUG and request.GET.get('_dev', '') == '1' or \
       dj_settings.DEBUG and not dj_settings.COMPRESS_ENABLED:
        context_extras['debug'] = True
        from django.db import connection
        # Return a lazy reference that computes connection.queries on access,
        # to ensure it contains queries triggered after this function runs.
        context_extras['sql_queries'] = lazy(lambda: connection.queries, list)
    return context_extras

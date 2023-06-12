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

import seaserv

from seahub.settings import SEAFILE_VERSION, SITE_DESCRIPTION, \
    MAX_FILE_NAME, LOGO_PATH, BRANDING_CSS, LOGO_WIDTH, LOGO_HEIGHT,\
    SHOW_REPO_DOWNLOAD_BUTTON, SITE_ROOT, ENABLE_GUEST_INVITATION, \
    FAVICON_PATH, APPLE_TOUCH_ICON_PATH, THUMBNAIL_SIZE_FOR_ORIGINAL, \
    MEDIA_ROOT, SHOW_LOGOUT_ICON, CUSTOM_LOGO_PATH, CUSTOM_FAVICON_PATH, \
    ENABLE_SEAFILE_DOCS, LOGIN_BG_IMAGE_PATH, \
    CUSTOM_LOGIN_BG_PATH, ENABLE_SHARE_LINK_REPORT_ABUSE, \
    PRIVACY_POLICY_LINK, TERMS_OF_SERVICE_LINK, ENABLE_SEADOC

from seahub.organizations.models import OrgAdminSettings
from seahub.organizations.settings import ORG_ENABLE_ADMIN_CUSTOM_LOGO
from seahub.onlyoffice.settings import ENABLE_ONLYOFFICE, ONLYOFFICE_CONVERTER_EXTENSIONS
from seahub.constants import DEFAULT_ADMIN
from seahub.utils import get_site_name, get_service_url
from seahub.avatar.templatetags.avatar_tags import api_avatar_url


from seahub.utils import HAS_FILE_SEARCH, EVENTS_ENABLED, is_pro_version, ENABLE_REPO_AUTO_DEL

try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False
try:
    from seahub.settings import ENABLE_FILE_SCAN
except ImportError:
    ENABLE_FILE_SCAN = False
from seahub.work_weixin.settings import ENABLE_WORK_WEIXIN
from seahub.weixin.settings import ENABLE_WEIXIN

try:
    from seahub.settings import SIDE_NAV_FOOTER_CUSTOM_HTML
except ImportError:
    SIDE_NAV_FOOTER_CUSTOM_HTML = ''

try:
    from seahub.settings import ABOUT_DIALOG_CUSTOM_HTML
except ImportError:
    ABOUT_DIALOG_CUSTOM_HTML = ''


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
    login_bg_path = LOGIN_BG_IMAGE_PATH

    # filter ajax/api request out
    avatar_url = ''
    username = request.user.username

    if (not request.headers.get('x-requested-with') == 'XMLHttpRequest') and ("api2/" not in request.path) and \
            ("api/v2.1/" not in request.path):

        # get logo path
        custom_logo_file = os.path.join(MEDIA_ROOT, CUSTOM_LOGO_PATH)
        if os.path.exists(custom_logo_file):
            logo_path = CUSTOM_LOGO_PATH

        if ORG_ENABLE_ADMIN_CUSTOM_LOGO and org:
            org_logo_url = OrgAdminSettings.objects.get_org_logo_url(org.org_id)
            if org_logo_url:
                logo_path = org_logo_url

        # get favicon path
        custom_favicon_file = os.path.join(MEDIA_ROOT, CUSTOM_FAVICON_PATH)
        if os.path.exists(custom_favicon_file):
            favicon_path = CUSTOM_FAVICON_PATH

        # get login bg path
        custom_login_bg_file = os.path.join(MEDIA_ROOT, CUSTOM_LOGIN_BG_PATH)
        if os.path.exists(custom_login_bg_file):
            login_bg_path = CUSTOM_LOGIN_BG_PATH

        avatar_url, is_default, date_uploaded = api_avatar_url(username, 72)

    result = {
        'seafile_version': SEAFILE_VERSION,
        'site_title': config.SITE_TITLE,
        'site_description': SITE_DESCRIPTION,
        'branding_css': BRANDING_CSS,
        'enable_branding_css': config.ENABLE_BRANDING_CSS,
        'favicon_path': favicon_path,
        'apple_touch_icon_path': APPLE_TOUCH_ICON_PATH,
        'login_bg_path': login_bg_path,
        'logo_path': logo_path,
        'logo_width': LOGO_WIDTH,
        'logo_height': LOGO_HEIGHT,
        'cloud_mode': request.cloud_mode,
        'org': org,
        'site_name': get_site_name(),
        'enable_signup': config.ENABLE_SIGNUP,
        'enable_weixin': ENABLE_WEIXIN,
        'max_file_name': MAX_FILE_NAME,
        'has_file_search': HAS_FILE_SEARCH,
        'show_repo_download_button': SHOW_REPO_DOWNLOAD_BUTTON,
        'share_link_force_use_password': config.SHARE_LINK_FORCE_USE_PASSWORD,
        'share_link_password_min_length': config.SHARE_LINK_PASSWORD_MIN_LENGTH,
        'share_link_password_strength_level': config.SHARE_LINK_PASSWORD_STRENGTH_LEVEL,
        'repo_password_min_length': config.REPO_PASSWORD_MIN_LENGTH,
        'events_enabled': EVENTS_ENABLED,
        'sysadmin_extra_enabled': True if is_pro_version() else False,
        'multi_tenancy': MULTI_TENANCY,
        'multi_institution': getattr(dj_settings, 'MULTI_INSTITUTION', False),
        'search_repo_id': search_repo_id,
        'SITE_ROOT': SITE_ROOT,
        'CSRF_COOKIE_NAME': dj_settings.CSRF_COOKIE_NAME,
        'constance_enabled': dj_settings.CONSTANCE_ENABLED,
        'FILE_SERVER_ROOT': file_server_root,
        'USE_GO_FILESERVER': seaserv.USE_GO_FILESERVER if hasattr(seaserv, 'USE_GO_FILESERVER') else False,
        'LOGIN_URL': dj_settings.LOGIN_URL,
        'enableOnlyoffice': ENABLE_ONLYOFFICE,
        'onlyofficeConverterExtensions': ONLYOFFICE_CONVERTER_EXTENSIONS,
        'thumbnail_size_for_original': THUMBNAIL_SIZE_FOR_ORIGINAL,
        'enable_guest_invitation': ENABLE_GUEST_INVITATION,
        'enable_terms_and_conditions': config.ENABLE_TERMS_AND_CONDITIONS,
        'show_logout_icon': SHOW_LOGOUT_ICON,
        'is_pro': True if is_pro_version() else False,
        'is_docs': ENABLE_SEAFILE_DOCS,
        'enable_upload_folder': dj_settings.ENABLE_UPLOAD_FOLDER,
        'enable_resumable_fileupload': dj_settings.ENABLE_RESUMABLE_FILEUPLOAD,
        'service_url': get_service_url().rstrip('/'),
        'enable_file_scan': ENABLE_FILE_SCAN,
        'enable_work_weixin': ENABLE_WORK_WEIXIN,
        'avatar_url': avatar_url if avatar_url else '',
        'privacy_policy_link': PRIVACY_POLICY_LINK,
        'terms_of_service_link': TERMS_OF_SERVICE_LINK,
        'side_nav_footer_custom_html': SIDE_NAV_FOOTER_CUSTOM_HTML,
        'about_dialog_custom_html': ABOUT_DIALOG_CUSTOM_HTML,
        'enable_repo_auto_del': ENABLE_REPO_AUTO_DEL,
        'enable_seadoc': ENABLE_SEADOC
    }

    if request.user.is_staff:
        result['is_default_admin'] = request.user.admin_role == DEFAULT_ADMIN
        result['enable_share_link_report_abuse'] = ENABLE_SHARE_LINK_REPORT_ABUSE

    return result


def debug(request):
    """
    Returns context variables helpful for debugging.
    """
    context_extras = {}
    if dj_settings.DEBUG and request.META.get('REMOTE_ADDR') in dj_settings.INTERNAL_IPS or \
       dj_settings.DEBUG and request.GET.get('_dev', '') == '1':
        context_extras['debug'] = True
        from django.db import connection
        # Return a lazy reference that computes connection.queries on access,
        # to ensure it contains queries triggered after this function runs.
        context_extras['sql_queries'] = lazy(lambda: connection.queries, list)
    return context_extras

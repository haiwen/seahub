import os


from seahub.settings import LOGIN_BG_IMAGE_PATH, MEDIA_ROOT, ENABLE_OAUTH, ENABLE_ADFS_LOGIN, \
    ENABLE_MULTI_ADFS, DISABLE_SSO_USER_LOCAL_PWD_LOGIN
from seahub.auth.models import SocialAuthUser
import seahub.settings as settings
from seahub.utils import gen_token, is_ldap_user
from datetime import datetime
from seaserv import ccnet_api

VIRTUAL_ID_EMAIL_DOMAIN = '@auth.local'

AUTHORIZATION_PREFIX = [
    'token',
    'bearer'
]

MONTH_SEASON_MAP = {
    1:  'winter',
    2:  'winter',
    3:  'spring',
    4:  'spring',
    5:  'spring',
    6:  'summer',
    7:  'summer',
    8:  'summer',
    9:  'autumn',
    10: 'autumn',
    11: 'autumn',
    12: 'winter'
}


def get_login_bg_image_path():
    """ Return custom background image path if it exists, otherwise return default background image path.
    """
    current_month = datetime.today().month
    login_bg_image_path = "img/login-background/%s-bg.jpg" % MONTH_SEASON_MAP.get(current_month)
    if not os.path.exists(os.path.join(MEDIA_ROOT, login_bg_image_path)):
        login_bg_image_path = LOGIN_BG_IMAGE_PATH

    # get path that background image of login page
    custom_login_bg_image_path = get_custom_login_bg_image_path()
    if os.path.exists(os.path.join(MEDIA_ROOT, custom_login_bg_image_path)):
        login_bg_image_path = custom_login_bg_image_path
    return login_bg_image_path


def get_custom_login_bg_image_path():
    """ Ensure consistency between utils and api.
    """
    return 'custom/login-bg.jpg'


def gen_user_virtual_id():
    return gen_token(max_length=32) + VIRTUAL_ID_EMAIL_DOMAIN


REMOTE_USER_PROVIDER = 'remote-user'
KRB5_PROVIDER = 'kerberos'


def is_remote_user(user_obj):
    """Return whether ``user_obj`` is authenticated by an external provider."""
    if is_ldap_user(user_obj):
        return True

    username = getattr(user_obj, 'username', '')
    return bool(username) and SocialAuthUser.objects.filter(username=username).exists()


def user_local_password_enabled(user_obj):
    """Return whether ``user_obj`` may set and use a Seafile local password."""
    if is_force_user_sso(user_obj):
        return False

    if not is_remote_user(user_obj):
        return True

    return not DISABLE_SSO_USER_LOCAL_PWD_LOGIN


def is_force_user_sso(user_obj):

    from seahub.organizations.models import OrgAdminSettings, FORCE_ADFS_LOGIN
    from seahub.organizations.utils import can_use_sso_in_multi_tenancy

    enable_sso = ENABLE_OAUTH or ENABLE_ADFS_LOGIN
    force_sso = False
    is_admin = False
    username = user_obj.username
    org_id = -1
    orgs = ccnet_api.get_orgs_by_user(username)

    saml_provider_identifier = getattr(settings, 'SAML_PROVIDER_IDENTIFIER', 'saml')
    oauth_provider_identifier = getattr(settings, 'OAUTH_PROVIDER_DOMAIN', '')

    if orgs:
        org_id = orgs[0].org_id

    if org_id > 0 and ENABLE_MULTI_ADFS and can_use_sso_in_multi_tenancy(org_id):
        is_admin = ccnet_api.is_org_staff(org_id, username)
        org_settings = OrgAdminSettings.objects.filter(org_id=org_id, key=FORCE_ADFS_LOGIN).first()
        if org_settings:
            force_sso = int(org_settings.value)
    elif enable_sso:
        force_sso = DISABLE_SSO_USER_LOCAL_PWD_LOGIN
        is_admin = user_obj.is_staff

    if force_sso and (not is_admin):
        sso_user = SocialAuthUser.objects.filter(
            username=username,
            provider__in=[saml_provider_identifier, oauth_provider_identifier]
        )
        if sso_user.exists():
            return True

    return False

import os
from seahub.settings import LOGIN_BG_IMAGE_PATH, MEDIA_ROOT
from seahub.utils import gen_token
from datetime import datetime

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

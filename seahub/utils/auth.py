import os
from seahub.settings import LOGIN_BG_IMAGE_PATH, MEDIA_ROOT

def get_login_bg_image_path():
    """ Return custom background image path if it exists, otherwise return default background image path.
    """
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

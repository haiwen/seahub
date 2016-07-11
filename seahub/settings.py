# -*- coding: utf-8 -*-
# Django settings for seahub project.

import sys
import os
import re

from seaserv import FILE_SERVER_ROOT, FILE_SERVER_PORT, SERVICE_URL

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), os.pardir)

DEBUG = False
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    # ('Your Name', 'your_email@domain.com'),
)

MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3', # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': '%s/seahub/seahub.db' % PROJECT_ROOT, # Or path to database file if using sqlite3.
        'USER': '',                      # Not used with sqlite3.
        'PASSWORD': '',                  # Not used with sqlite3.
        'HOST': '',                      # Set to empty string for localhost. Not used with sqlite3.
        'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
    }
}

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'Asia/Shanghai'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = False

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_ROOT = '%s/media/' % PROJECT_ROOT

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash if there is a path component (optional in other cases).
# Examples: "http://media.lawrence.com", "http://example.com/media/"
MEDIA_URL = '/media/'

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = '%s/assets/' % MEDIA_ROOT

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = '/media/assets/'

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    '%s/static' % PROJECT_ROOT,
)

STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.CachedStaticFilesStorage'

# StaticI18N config
STATICI18N_ROOT = '%s/static/scripts' % PROJECT_ROOT
STATICI18N_OUTPUT_DIR = 'i18n'

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
    'compressor.finders.CompressorFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'n*v0=jz-1rz@(4gx^tf%6^e7c&um@2)g-l=3_)t@19a69n1nv6'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
)

# Order is important
MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'seahub.auth.middleware.AuthenticationMiddleware',
    'seahub.base.middleware.BaseMiddleware',
    'seahub.base.middleware.InfobarMiddleware',
    'seahub.password_session.middleware.CheckPasswordHash',
    'seahub.base.middleware.ForcePasswdChangeMiddleware',
)

SITE_ROOT_URLCONF = 'seahub.urls'
ROOT_URLCONF = 'seahub.utils.rooturl'
SITE_ROOT = '/'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'seahub.wsgi.application'

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(PROJECT_ROOT, '../../seahub-data/custom/templates'),
    os.path.join(PROJECT_ROOT, 'seahub/templates'),
)

# This is defined here as a do-nothing function because we can't import
# django.utils.translation -- that module depends on the settings.
gettext_noop = lambda s: s
LANGUAGES = (
    ('ca', gettext_noop('català')),
    ('de', gettext_noop(u'Deutsch')),
    ('en', gettext_noop('English')),
    ('es', gettext_noop('Español')),
    ('es-ar', gettext_noop('Español de Argentina')),
    ('es-mx', gettext_noop('Español de México')),
    ('fr', gettext_noop('français')),
    ('he', gettext_noop('עברית')),
    ('hu', gettext_noop('Magyar')),
    ('is', gettext_noop('Íslenska')),
    ('it', gettext_noop('Italiano')),
    ('ja', gettext_noop('日本語')),
    ('ko', gettext_noop('한국어')),
    ('lv', gettext_noop('Latvian')),
    ('nl', gettext_noop('Nederlands')),
    ('pl', gettext_noop('Polski')),
    ('pt-br', gettext_noop('Portuguese, Brazil')),
    ('ru', gettext_noop(u'Русский')),
    ('sk', gettext_noop('Slovak')),
    ('sl', gettext_noop('Slovenian')),
    ('sv', gettext_noop('Svenska')),
    ('th', gettext_noop('ไทย')),
    ('tr', gettext_noop('Türkçe')),
    ('uk', gettext_noop('українська мова')),
    ('zh-cn', gettext_noop(u'简体中文')),
    ('zh-tw', gettext_noop(u'繁體中文')),
)
LOCALE_PATHS = (
    os.path.join(PROJECT_ROOT, 'locale'),
)

TEMPLATE_CONTEXT_PROCESSORS = (
    'django.contrib.auth.context_processors.auth',
    'django.core.context_processors.debug',
    'django.core.context_processors.i18n',
    'django.core.context_processors.media',
    'django.core.context_processors.static',
    # 'djblets.util.context_processors.siteRoot',
    'django.core.context_processors.request',
    'django.contrib.messages.context_processors.messages',
    'seahub.base.context_processors.base',
)

INSTALLED_APPS = (
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'registration',
    'captcha',
    'compressor',
    'statici18n',
    'constance',
    'constance.backends.database',
    'post_office',

    'seahub.api2',
    'seahub.avatar',
    'seahub.base',
    'seahub.contacts',
    'seahub.institutions',
    'seahub.wiki',
    'seahub.group',
    'seahub.message',
    'seahub.notifications',
    'seahub.options',
    'seahub.profile',
    'seahub.share',
    'seahub.help',
    'seahub.thumbnail',
    'seahub.password_session',
)

# Enabled or disable constance(web settings).
ENABLE_SETTINGS_VIA_WEB = True
CONSTANCE_BACKEND = 'constance.backends.database.DatabaseBackend'
CONSTANCE_DATABASE_CACHE_BACKEND = 'default'

AUTHENTICATION_BACKENDS = (
    'seahub.base.accounts.AuthBackend',
)
LOGIN_REDIRECT_URL = '/profile/'
LOGIN_URL = SITE_ROOT + 'accounts/login'

ACCOUNT_ACTIVATION_DAYS = 7

# allow seafile amdin view user's repo
ENABLE_SYS_ADMIN_VIEW_REPO = False

#allow search from LDAP directly during auto-completion (not only search imported users)
ENABLE_SEARCH_FROM_LDAP_DIRECTLY = False

# show traffic on the UI
SHOW_TRAFFIC = True

# Enable or disable make group public
ENABLE_MAKE_GROUP_PUBLIC = False

# show or hide library 'download' button
SHOW_REPO_DOWNLOAD_BUTTON = False

# enable 'upload folder' or not
ENABLE_UPLOAD_FOLDER = False

# enable resumable fileupload or not
ENABLE_RESUMABLE_FILEUPLOAD = False

# enable encrypt library
ENABLE_ENCRYPTED_LIBRARY = True

# mininum length for password of encrypted library
REPO_PASSWORD_MIN_LENGTH = 8

# mininum length for the password of a share link
SHARE_LINK_PASSWORD_MIN_LENGTH = 8

# enable or disable share link audit
ENABLE_SHARE_LINK_AUDIT = False

# mininum length for user's password
USER_PASSWORD_MIN_LENGTH = 6

# LEVEL based on four types of input:
# num, upper letter, lower letter, other symbols
# '3' means password must have at least 3 types of the above.
USER_PASSWORD_STRENGTH_LEVEL = 3

# default False, only check USER_PASSWORD_MIN_LENGTH
# when True, check password strength level, STRONG(or above) is allowed
USER_STRONG_PASSWORD_REQUIRED = False

# Force user to change password when admin add/reset a user.
FORCE_PASSWORD_CHANGE = True

# Using server side crypto by default, otherwise, let user choose crypto method.
FORCE_SERVER_CRYPTO = True

# Enable or disable repo history setting
ENABLE_REPO_HISTORY_SETTING = True

# Enable or disable org repo creation by user
ENABLE_USER_CREATE_ORG_REPO = True

DISABLE_SYNC_WITH_ANY_FOLDER = False

# File preview
FILE_PREVIEW_MAX_SIZE = 30 * 1024 * 1024
OFFICE_PREVIEW_MAX_SIZE = 2 * 1024 * 1024
USE_PDFJS = True
FILE_ENCODING_LIST = ['auto', 'utf-8', 'gbk', 'ISO-8859-1', 'ISO-8859-5']
FILE_ENCODING_TRY_LIST = ['utf-8', 'gbk']
HIGHLIGHT_KEYWORD = False # If True, highlight the keywords in the file when the visit is via clicking a link in 'search result' page.

# Common settings(file extension, storage) for avatar and group avatar.
AVATAR_FILE_STORAGE = '' # Replace with 'seahub.base.database_storage.DatabaseStorage' if save avatar files to database
AVATAR_ALLOWED_FILE_EXTS = ('.jpg', '.png', '.jpeg', '.gif')
# Avatar
AVATAR_STORAGE_DIR = 'avatars'
AVATAR_HASH_USERDIRNAMES = True
AVATAR_HASH_FILENAMES = True
AVATAR_GRAVATAR_BACKUP = False
AVATAR_DEFAULT_URL = '/avatars/default.png'
AVATAR_DEFAULT_NON_REGISTERED_URL = '/avatars/default-non-register.jpg'
AVATAR_MAX_AVATARS_PER_USER = 1
AVATAR_CACHE_TIMEOUT = 14 * 24 * 60 * 60
AUTO_GENERATE_AVATAR_SIZES = (16, 20, 24, 28, 32, 36, 40, 48, 60, 64, 80, 290)
# Group avatar
GROUP_AVATAR_STORAGE_DIR = 'avatars/groups'
GROUP_AVATAR_DEFAULT_URL = 'avatars/groups/default.png'
AUTO_GENERATE_GROUP_AVATAR_SIZES = (20, 24, 32, 36, 48, 56)

LOG_DIR = os.environ.get('SEAHUB_LOG_DIR', '/tmp')
CACHE_DIR = "/tmp"
install_topdir = os.path.expanduser(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
central_conf_dir = os.environ.get('SEAFILE_CENTRAL_CONF_DIR', '')

if 'win32' in sys.platform:
    try:
        CCNET_CONF_PATH = os.environ['CCNET_CONF_DIR']
        if not CCNET_CONF_PATH: # If it's set but is an empty string.
            raise KeyError
    except KeyError:
        raise ImportError("Settings cannot be imported, because environment variable CCNET_CONF_DIR is undefined.")
    else:
        LOG_DIR = os.environ.get('SEAHUB_LOG_DIR', os.path.join(CCNET_CONF_PATH, '..'))
        CACHE_DIR = os.path.join(CCNET_CONF_PATH, '..')
        install_topdir = os.path.join(CCNET_CONF_PATH, '..')

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': os.path.join(CACHE_DIR, 'seahub_cache'),
        'OPTIONS': {
            'MAX_ENTRIES': 1000000
        }
    }
}

# rest_framwork
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'ping': '600/minute',
        'anon': '5/minute',
        'user': '300/minute',
    },
}

# file and path
MAX_UPLOAD_FILE_NAME_LEN    = 255
MAX_FILE_NAME 		    = MAX_UPLOAD_FILE_NAME_LEN
MAX_PATH 		    = 4096

FILE_LOCK_EXPIRATION_DAYS = 0

# Whether or not activate user when registration complete.
# If set to ``False``, new user will be activated by admin or via activate link.
ACTIVATE_AFTER_REGISTRATION = True
# Whether or not send activation Email to user when registration complete.
# This option will be ignored if ``ACTIVATE_AFTER_REGISTRATION`` set to ``True``.
REGISTRATION_SEND_MAIL = False

REQUIRE_DETAIL_ON_REGISTRATION = False

# Account initial password, for password resetting.
# INIT_PASSWD can either be a string, or a function (function has to be set without the brackets)
def genpassword():
    from django.utils.crypto import get_random_string
    return get_random_string(10)
INIT_PASSWD = genpassword

# browser tab title
SITE_TITLE = 'Private Seafile'

# Base name used in email sending
SITE_NAME = 'Seafile'

# Path to the Logo Imagefile (relative to the media path)
LOGO_PATH = 'img/seafile-logo.png'
# logo size. the unit is 'px'
LOGO_WIDTH = 128
LOGO_HEIGHT = 32

# css to modify the seafile css (e.g. css/my_site.css)
BRANDING_CSS = ''

# Using Django to server static file. Set to `False` if deployed behide a web
# server.
SERVE_STATIC = True

# Enable or disable registration on web.
ENABLE_SIGNUP = False

# For security consideration, please set to match the host/domain of your site, e.g., ALLOWED_HOSTS = ['.example.com'].
# Please refer https://docs.djangoproject.com/en/dev/ref/settings/#allowed-hosts for details.
ALLOWED_HOSTS = ['*']

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
    'formatters': {
        'standard': {
            'format': '%(asctime)s [%(levelname)s] %(name)s:%(lineno)s %(funcName)s %(message)s'
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
         }
     },
    'handlers': {
        'default': {
            'level':'INFO',
            'class':'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOG_DIR, 'seahub.log'),
            'maxBytes': 1024*1024*10, # 10 MB
            'formatter':'standard',
        },
        'request_handler': {
                'level':'INFO',
                'class':'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, 'seahub_django_request.log'),
                'maxBytes': 1024*1024*10, # 10 MB
                'formatter':'standard',
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        '': {
            'handlers': ['default'],
            'level': 'INFO',
            'propagate': True
        },
        'django.request': {
            'handlers': ['request_handler', 'mail_admins'],
            'level': 'INFO',
            'propagate': False
        },
    }
}

#Login Attempt
LOGIN_ATTEMPT_LIMIT = 3
LOGIN_ATTEMPT_TIMEOUT = 15 * 60 # in seconds (default: 15 minutes)
FREEZE_USER_ON_LOGIN_FAILED = False # deactivate user account when login attempts exceed limit

# Age of cookie, in seconds (default: 1 day).
SESSION_COOKIE_AGE = 24 * 60 * 60

# Days of remembered login info (deafult: 7 days)
LOGIN_REMEMBER_DAYS = 7

SEAFILE_VERSION = '5.1.0'

# Compress static files(css, js)
COMPRESS_URL = MEDIA_URL
COMPRESS_ROOT = MEDIA_ROOT
COMPRESS_DEBUG_TOGGLE = 'nocompress'
COMPRESS_CSS_HASHING_METHOD = 'content'
COMPRESS_CSS_FILTERS = [
    'compressor.filters.css_default.CssAbsoluteFilter',
    'compressor.filters.cssmin.CSSMinFilter',
]


###################
# Image Thumbnail #
###################

# Enable or disable thumbnail
ENABLE_THUMBNAIL = True

# Absolute filesystem path to the directory that will hold thumbnail files.
SEAHUB_DATA_ROOT = os.path.join(PROJECT_ROOT, '../../seahub-data')
if os.path.exists(SEAHUB_DATA_ROOT):
    THUMBNAIL_ROOT = os.path.join(SEAHUB_DATA_ROOT, 'thumbnail')
else:
    THUMBNAIL_ROOT = os.path.join(PROJECT_ROOT, 'seahub/thumbnail/thumb')

THUMBNAIL_EXTENSION = 'png'

# for thumbnail: height(px) and width(px)
THUMBNAIL_DEFAULT_SIZE = 48
THUMBNAIL_SIZE_FOR_GRID = 192


# size(MB) limit for generate thumbnail
THUMBNAIL_IMAGE_SIZE_LIMIT = 20
THUMBNAIL_IMAGE_ORIGINAL_SIZE_LIMIT = 256

#####################
# Global AddressBook #
#####################
ENABLE_GLOBAL_ADDRESSBOOK = True

#####################
# Folder Permission #
#####################
ENABLE_FOLDER_PERM = False

####################
# Role permissions #
####################
# default permissions:
# 'default': {
#     'can_add_repo': True,
#     'can_add_group': True,
#     'can_view_org': True,
#     'can_user_global_address_book': True,
#     'can_generate_shared_link': True,
#     'can_invite_guest': False,
# }
from seahub.constants import GUEST_USER
ENABLED_ROLE_PERMISSIONS = {
    GUEST_USER: {
        'can_add_repo': False,
        'can_add_group': False,
        'can_view_org': False,
        'can_use_global_address_book': False,
        'can_generate_shared_link': False,
        'can_invite_guest': False,
    },
}

#####################
# Sudo Mode #
#####################
ENABLE_SUDO_MODE = True

#################
# Email sending #
#################

SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER = True # Whether to send email when a system staff adding new member.
SEND_EMAIL_ON_RESETTING_USER_PASSWD = True # Whether to send email when a system staff resetting user's password.

##########################
# Settings for Extra App #
##########################

ENABLE_SUB_LIBRARY = True

############################
# Settings for Seahub Priv #
############################

# Replace from email to current user instead of email sender.
REPLACE_FROM_EMAIL = False

# Add ``Reply-to`` header, see RFC #822.
ADD_REPLY_TO_HEADER = False

CLOUD_DEMO_USER = 'demo@seafile.com'

ENABLE_TWO_FACTOR_AUTH = False
OTP_LOGIN_URL = '/profile/two_factor_authentication/setup/'

#####################
# External settings #
#####################

def load_local_settings(module):
    '''Import any symbols that begin with A-Z. Append to lists any symbols
    that begin with "EXTRA_".

    '''
    if hasattr(module, 'HTTP_SERVER_ROOT'):
        if not hasattr(module, 'FILE_SERVER_ROOT'):
            module.FILE_SERVER_ROOT = module.HTTP_SERVER_ROOT
        del module.HTTP_SERVER_ROOT
    for attr in dir(module):
        match = re.search('^EXTRA_(\w+)', attr)
        if match:
            name = match.group(1)
            value = getattr(module, attr)
            try:
                globals()[name] += value
            except KeyError:
                globals()[name] = value
        elif re.search('^[A-Z]', attr):
            globals()[attr] = getattr(module, attr)


# Load seahub_extra_settings.py
try:
    from seahub_extra import seahub_extra_settings
except ImportError:
    pass
else:
    load_local_settings(seahub_extra_settings)
    del seahub_extra_settings

# Load local_settings.py
try:
    import seahub.local_settings
except ImportError:
    pass
else:
    load_local_settings(seahub.local_settings)
    del seahub.local_settings

# Load seahub_settings.py in server release
try:
    if os.path.exists(central_conf_dir):
        sys.path.insert(0, central_conf_dir)
    import seahub_settings
except ImportError:
    pass
else:
    # In server release, sqlite3 db file is <topdir>/seahub.db
    DATABASES['default']['NAME'] = os.path.join(install_topdir, 'seahub.db')
    if 'win32' not in sys.platform:
        # In server release, gunicorn is used to deploy seahub
        INSTALLED_APPS += ('gunicorn', )

    load_local_settings(seahub_settings)
    del seahub_settings

# Remove install_topdir from path
sys.path.pop(0)

if 'win32' in sys.platform:
    INSTALLED_APPS += ('django_wsgiserver', )
    fp = open(os.path.join(install_topdir, "seahub.pid"), 'w')
    fp.write("%d\n" % os.getpid())
    fp.close()

# Following settings are private, can not be overwrite.
INNER_FILE_SERVER_ROOT = 'http://127.0.0.1:' + FILE_SERVER_PORT

CONSTANCE_ENABLED = ENABLE_SETTINGS_VIA_WEB
CONSTANCE_CONFIG = {
    'SERVICE_URL': (SERVICE_URL,''),
    'FILE_SERVER_ROOT': (FILE_SERVER_ROOT,''),
    'DISABLE_SYNC_WITH_ANY_FOLDER': (DISABLE_SYNC_WITH_ANY_FOLDER,''),

    'ENABLE_SIGNUP': (ENABLE_SIGNUP,''),
    'ACTIVATE_AFTER_REGISTRATION': (ACTIVATE_AFTER_REGISTRATION,''),
    'REGISTRATION_SEND_MAIL': (REGISTRATION_SEND_MAIL ,''),
    'LOGIN_REMEMBER_DAYS': (LOGIN_REMEMBER_DAYS,''),
    'LOGIN_ATTEMPT_LIMIT': (LOGIN_ATTEMPT_LIMIT, ''),
    'FREEZE_USER_ON_LOGIN_FAILED': (FREEZE_USER_ON_LOGIN_FAILED, ''),

    'ENABLE_USER_CREATE_ORG_REPO': (ENABLE_USER_CREATE_ORG_REPO, ''),

    'ENABLE_ENCRYPTED_LIBRARY': (ENABLE_ENCRYPTED_LIBRARY,''),
    'REPO_PASSWORD_MIN_LENGTH': (REPO_PASSWORD_MIN_LENGTH,''),
    'ENABLE_REPO_HISTORY_SETTING': (ENABLE_REPO_HISTORY_SETTING,''),
    'FORCE_PASSWORD_CHANGE': (FORCE_PASSWORD_CHANGE, ''),

    'USER_STRONG_PASSWORD_REQUIRED': (USER_STRONG_PASSWORD_REQUIRED,''),
    'USER_PASSWORD_MIN_LENGTH': (USER_PASSWORD_MIN_LENGTH,''),
    'USER_PASSWORD_STRENGTH_LEVEL': (USER_PASSWORD_STRENGTH_LEVEL,''),

    'SHARE_LINK_PASSWORD_MIN_LENGTH': (SHARE_LINK_PASSWORD_MIN_LENGTH,''),
    'ENABLE_TWO_FACTOR_AUTH': (ENABLE_TWO_FACTOR_AUTH,''),
}

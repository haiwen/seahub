# -*- coding: utf-8 -*-
# Django settings for seahub project.

import sys
import os
import re
import random
import string

from seaserv import FILE_SERVER_ROOT, FILE_SERVER_PORT

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), os.pardir)

DEBUG = True
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
STATIC_ROOT = ''

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = ''

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
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
)

SITE_ROOT_URLCONF = 'seahub.urls'
ROOT_URLCONF = 'djblets.util.rooturl'
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
    ('es-ar', gettext_noop('Argentinian Spanish')),
    ('es-mx', gettext_noop('Mexican Spanish')),
    ('fr', gettext_noop('français')),
    ('he', gettext_noop('עברית')),
    ('hu', gettext_noop('Magyar')),
    ('is', gettext_noop('Íslenska')),
    ('it', gettext_noop('Italiano')),
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
    'djblets.util.context_processors.siteRoot',
    'django.core.context_processors.request',
    'django.contrib.messages.context_processors.messages',
    'seahub.base.context_processors.base',
)

INSTALLED_APPS = (
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',

    'registration',
    'captcha',

    'seahub.api2',
    'seahub.avatar',
    'seahub.base',
    'seahub.contacts',
    'seahub.wiki',
    'seahub.group',
    'seahub.message',
    'seahub.notifications',
    'seahub.options',
    'seahub.profile',
    'seahub.share',
    'seahub.help',
    'seahub.thumbnail',
)


AUTHENTICATION_BACKENDS = (
    'seahub.base.accounts.AuthBackend',
)

ACCOUNT_ACTIVATION_DAYS = 7

# Enable or disable make group public
ENABLE_MAKE_GROUP_PUBLIC = False

# show or hide library 'download' button
SHOW_REPO_DOWNLOAD_BUTTON = False

# enable 'upload folder' or not
ENABLE_UPLOAD_FOLDER = False

# mininum length for password of encrypted library
REPO_PASSWORD_MIN_LENGTH = 8

# mininum length for user's password
USER_PASSWORD_MIN_LENGTH = 6

# LEVEL based on four types of input:
# num, upper letter, lower letter, other symbols
# '3' means password must have at least 3 types of the above.
USER_PASSWORD_STRENGTH_LEVEL = 3

# default False, only check USER_PASSWORD_MIN_LENGTH
# when True, check password strength level, STRONG(or above) is allowed
USER_STRONG_PASSWORD_REQUIRED = False

# Using server side crypto by default, otherwise, let user choose crypto method.
FORCE_SERVER_CRYPTO = True

# Enable or disable repo history setting
ENABLE_REPO_HISTORY_SETTING = True

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
AUTO_GENERATE_AVATAR_SIZES = (16, 20, 24, 28, 32, 36, 40, 48, 60, 80)
# Group avatar
GROUP_AVATAR_STORAGE_DIR = 'avatars/groups'
GROUP_AVATAR_DEFAULT_URL = 'avatars/groups/default.png'
AUTO_GENERATE_GROUP_AVATAR_SIZES = (20, 24, 32, 36, 48, 56)

LOG_DIR = os.environ.get('SEAHUB_LOG_DIR', '/tmp')
CACHE_DIR = "/tmp"
install_topdir = os.path.expanduser(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

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
    return ''.join([random.choice(string.digits + string.letters) for i in range(0, 10)])

INIT_PASSWD = genpassword

# browser tab title
SITE_TITLE = 'Private Seafile'

# Base url and name used in email sending
SITE_BASE = 'http://seafile.com'
SITE_NAME = 'Seafile'

# Path to the Logo Imagefile (relative to the media path)
LOGO_PATH = 'img/seafile_logo.png'
# logo size. the unit is 'px'
LOGO_WIDTH = 149
LOGO_HEIGHT = 32

# css to modify the seafile css (e.g. css/my_site.css)
BRANDING_CSS = ''

# Using Django to server static file. Set to `False` if deployed behide a web
# server.
SERVE_STATIC = True

# Enalbe or disalbe registration on web.
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
            'level':'WARN',
            'class':'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOG_DIR, 'seahub.log'),
            'maxBytes': 1024*1024*10, # 10 MB
            'formatter':'standard',
        },
        'request_handler': {
                'level':'WARN',
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
            'level': 'WARN',
            'propagate': True
        },
        'django.request': {
            'handlers': ['request_handler', 'mail_admins'],
            'level': 'WARN',
            'propagate': False
        },
    }
}

#Login Attempt
LOGIN_ATTEMPT_LIMIT = 3
LOGIN_ATTEMPT_TIMEOUT = 15 * 60 # in seconds (default: 15 minutes)

# Age of cookie, in seconds (default: 1 day).
SESSION_COOKIE_AGE = 24 * 60 * 60

# Days of remembered login info (deafult: 7 days)
LOGIN_REMEMBER_DAYS = 7

#Share Access
SHARE_ACCESS_PASSWD_TIMEOUT = 60 * 60

SEAFILE_VERSION = '3.0.0'

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
THUMBNAIL_DEFAULT_SIZE = '24'
PREVIEW_DEFAULT_SIZE = '100'

# for origin image file: size(MB)
THUMBNAIL_IMAGE_SIZE_LIMIT = 30

#################
# Email sending #
#################

SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER = True # Whether to send email when a system staff adding new member.
SEND_EMAIL_ON_RESETTING_USER_PASSWD = True # Whether to send email when a system staff resetting user's password.

##########################
# Settings for seafevents #
##########################

def get_events_conf_file():
    if not 'CCNET_CONF_DIR' in os.environ:
        return

    ccnet_dir = os.environ['CCNET_CONF_DIR']
    seafile_ini = os.path.join(ccnet_dir, 'seafile.ini')
    if not os.path.exists(seafile_ini):
        return

    with open(seafile_ini, 'r') as fp:
        seafile_data_dir = fp.read().strip()
        seafevents_conf = os.path.join(seafile_data_dir, 'seafevents.conf')
        if os.path.exists(seafevents_conf):
            globals()['EVENTS_CONFIG_FILE'] = seafevents_conf

get_events_conf_file()

##########################
# Settings for Extra App #
##########################

ENABLE_PUBFILE = False

ENABLE_SUB_LIBRARY = True

ENABLE_GUEST = False

############################
# Settings for Seahub Priv #
############################

# Replace from email to current user instead of email sender.
REPLACE_FROM_EMAIL = False

# Add ``Reply-to`` header, see RFC #822.
ADD_REPLY_TO_HEADER = False

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
    sys.path.insert(0, install_topdir)
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

# Put here after loading other settings files if `SITE_ROOT` is modified in
# other settings files.
LOGIN_URL = SITE_ROOT + 'accounts/login'

INNER_FILE_SERVER_ROOT = 'http://127.0.0.1:' + FILE_SERVER_PORT


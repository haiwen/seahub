# encoding: utf-8
# Django settings for seahub project.
import sys
import os
import re

DEBUG = False
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    # ('Your Name', 'your_email@domain.com'),
)

MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3', # Add 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': os.path.join(os.path.dirname(__file__), 'seahub.db'),                      # Or path to database file if using sqlite3.
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

# Absolute path to the directory that holds media.
# Example: "/home/media/media.lawrence.com/"
MEDIA_ROOT = os.path.join(os.path.dirname(__file__), "media")

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash if there is a path component (optional in other cases).
# Examples: "http://media.lawrence.com", "http://example.com/media/"
MEDIA_URL = '/media/'

# URL prefix for admin media -- CSS, JavaScript and images. Make sure to use a
# trailing slash.
# Examples: "http://foo.com/media/", "/media/".
ADMIN_MEDIA_PREFIX = '/media/'

ADMIN_MEDIA_PREFIX = '%sadmin/' %(MEDIA_URL)

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'n*v0=jz-1rz@(4gx^tf%6^e7c&um@2)g-l=3_)t@19a69n1nv6'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.load_template_source',
    'django.template.loaders.app_directories.load_template_source',
#     'django.template.loaders.eggs.load_template_source',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.csrf.CsrfResponseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'auth.middleware.AuthenticationMiddleware',
    'base.middleware.BaseMiddleware',
    'base.middleware.InfobarMiddleware',
)

SITE_ROOT_URLCONF = 'seahub.urls'
ROOT_URLCONF = 'djblets.util.rooturl'

SITE_ROOT = '/'

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(os.path.dirname(__file__), "templates"),
#    os.path.join(os.path.dirname(__file__),'thirdpart/djangorestframework/templates'),
)

# This is defined here as a do-nothing function because we can't import
# django.utils.translation -- that module depends on the settings.
gettext_noop = lambda s: s
LANGUAGES = (
    ('en', gettext_noop('English')),
    ('zh-cn', gettext_noop(u'简体中文')),
    ('ru', gettext_noop(u'Русский')),    
    ('de', gettext_noop(u'Deutsch')),
    ('es', gettext_noop('Español')),
    ('it', gettext_noop('Italiano')),
    ('fr', gettext_noop('Français')),
)
LOCALE_PATHS = (
    os.path.join(os.path.dirname(__file__), 'locale'),
    os.path.join(os.path.dirname(__file__), 'thirdpart/auth/locale'),
)

TEMPLATE_CONTEXT_PROCESSORS = (
    'django.core.context_processors.auth',
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

    'avatar',
    'registration',

    'seahub.base',
    'seahub.contacts',
    'seahub.wiki',
    'seahub.group',
    'seahub.notifications',
    # 'seahub.organizations',
    'seahub.profile',
    'seahub.share',
    'api2',
)

AUTHENTICATION_BACKENDS = (
    'auth.backends.ModelBackend',
)

ACCOUNT_ACTIVATION_DAYS = 7

# File preview
FILE_PREVIEW_MAX_SIZE = 30 * 1024 * 1024
USE_PDFJS = True
FILE_ENCODING_LIST = ['auto', 'utf-8', 'gbk', 'ISO-8859-1', 'ISO-8859-5']
FILE_ENCODING_TRY_LIST = ['utf-8', 'gbk']

# Avatar
AVATAR_STORAGE_DIR = 'avatars'
AVATAR_GRAVATAR_BACKUP = False
AVATAR_DEFAULT_URL = '/avatars/default.jpg'
AVATAR_DEFAULT_NON_REGISTERED_URL = '/avatars/default-non-register.jpg'
AVATAR_MAX_AVATARS_PER_USER = 1
AVATAR_CACHE_TIMEOUT = 24 * 60 * 60
AVATAR_ALLOWED_FILE_EXTS = ('.jpg', '.png', '.jpeg', '.gif')
AUTO_GENERATE_AVATAR_SIZES = (16, 20, 28, 40, 48, 60, 80)
# Group avatar
GROUP_AVATAR_STORAGE_DIR = 'avatars/groups'
GROUP_AVATAR_DEFAULT_URL = 'avatars/groups/default.png'
AUTO_GENERATE_GROUP_AVATAR_SIZES = (20, 24, 48)

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': '/tmp/seahub_cache',
        'OPTIONS': {
            'MAX_ENTRIES': 1000000
        }
    }
}

# rest_framwork
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '5/minute',
        'user': '300/minute',
    },
}

# file and path
MAX_UPLOAD_FILE_NAME_LEN    = 255
MAX_FILE_NAME 		    = MAX_UPLOAD_FILE_NAME_LEN
MAX_PATH 		    = 4096

# Set to True when user will be activaed after registration,
# and no email sending
ACTIVATE_AFTER_REGISTRATION = True
# In order to use email sending, `ACTIVATE_AFTER_REGISTRATION` must set to False
REGISTRATION_SEND_MAIL = False

# Seafile-applet address and port, used in repo download
CCNET_APPLET_ROOT = "http://localhost:13420"

# Account initial password, for password resetting.
INIT_PASSWD = '123456'

# browser tab title
SITE_TITLE = 'Private Seafile'

# Base url and name used in email sending
SITE_BASE = 'http://seafile.com'
SITE_NAME = 'Seafile'

# Using Django to server static file. Set to `False` if deployed behide a web
# server.
SERVE_STATIC = True

# Enalbe or disalbe registration on web.
ENABLE_SIGNUP = False

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
    'formatters': {
        'standard': {
            'format': '%(asctime)s [%(levelname)s] %(name)s:%(lineno)s %(funcName)s %(message)s'
        },
    },
    'handlers': {
        'default': {
            'level':'WARN',
            'class':'logging.handlers.RotatingFileHandler',
            'filename': '/tmp/seahub.log',
            'maxBytes': 1024*1024*10, # 10 MB
            'formatter':'standard',
        },  
        'request_handler': {
                'level':'WARN',
                'class':'logging.handlers.RotatingFileHandler',
                'filename': '/tmp/seahub_django_request.log',
                'maxBytes': 1024*1024*10, # 10 MB
                'formatter':'standard',
        },
        'mail_admins': {
            'level': 'ERROR',
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

#################
# Email sending #
#################

SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER = True # Whether to send email when a system staff adding new member.
SEND_EMAIL_ON_RESETTING_USER_PASSWD = True # Whether to send email when a system staff resetting user's password.

#####################
# External settings #
#####################

def load_local_settings(module):
    '''Import any symbols that begin with A-Z. Append to lists any symbols
    that begin with "EXTRA_".

    '''
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

# Load local_settngs.py
try:
    import local_settings
except ImportError:
    pass
else:
    load_local_settings(local_settings)
    del local_settings

# Load seahub_settings.py in server release
try:
    install_topdir = os.path.expanduser(os.path.join(os.path.dirname(__file__), '..', '..'))
    sys.path.insert(0, install_topdir)
    import seahub_settings
except ImportError:
    pass
else:
    # In server release, sqlite3 db file is <topdir>/seahub.db 
    DATABASES['default']['NAME'] = os.path.join(install_topdir, 'seahub.db')
    # In server release, gunicorn is used to deploy seahub
    INSTALLED_APPS += ('gunicorn', )
    load_local_settings(seahub_settings)
    del seahub_settings

# Remove install_topdir from path
sys.path.pop(0)

SEAFILE_VERSION = '1.5'

# Put here after loading other settings files if `SITE_ROOT` is modified in
# other settings files.
LOGIN_URL = SITE_ROOT + 'accounts/login'

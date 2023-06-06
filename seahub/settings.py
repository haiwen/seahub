# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
# Django settings for seahub project.

import sys
import os
import re

from seaserv import FILE_SERVER_PORT

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), os.pardir)

DEBUG = False

SERVICE_URL = 'http://127.0.0.1:8000'
FILE_SERVER_ROOT = 'http://127.0.0.1:' + FILE_SERVER_PORT

CLOUD_MODE = False

MULTI_TENANCY = False

ADMINS = [
    # ('Your Name', 'your_email@domain.com'),
]

MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',  # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': '%s/seahub/seahub.db' % PROJECT_ROOT,  # Or path to database file if using sqlite3.
        'USER': '',                      # Not used with sqlite3.
        'PASSWORD': '',                  # Not used with sqlite3.
        'HOST': '',                      # Set to empty string for localhost. Not used with sqlite3.
        'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
    }
}

# New in Django 3.2
# Default primary key field type to use for models that don’t have a field with primary_key=True.
DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'UTC'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.

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
    '%s/frontend/build' % PROJECT_ROOT,
)

WEBPACK_LOADER = {
    'DEFAULT': {
        'BUNDLE_DIR_NAME': 'frontend/',
        'STATS_FILE': os.path.join(PROJECT_ROOT, 'frontend/webpack-stats.pro.json'),
    }
}

DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
# STORAGES = {
#     "staticfiles": {
#         "BACKEND": 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage',
#     },
# }

# StaticI18N config
STATICI18N_ROOT = '%s/static/scripts' % PROJECT_ROOT
STATICI18N_OUTPUT_DIR = 'i18n'

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'n*v0=jz-1rz@(4gx^tf%6^e7c&um@2)g-l=3_)t@19a69n1nv6'

ENABLE_REMOTE_USER_AUTHENTICATION = False

# Order is important
MIDDLEWARE = [
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
    'termsandconditions.middleware.TermsAndConditionsRedirectMiddleware',
    'seahub.two_factor.middleware.OTPMiddleware',
    'seahub.two_factor.middleware.ForceTwoFactorAuthMiddleware',
    'seahub.trusted_ip.middleware.LimitIpMiddleware',
    'seahub.organizations.middleware.RedirectMiddleware',
]

SITE_ROOT_URLCONF = 'seahub.urls'
ROOT_URLCONF = 'seahub.utils.rooturl'
SITE_ROOT = '/'
CSRF_COOKIE_NAME = 'sfcsrftoken'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'seahub.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(PROJECT_ROOT, '../../seahub-data/custom/templates'),
            os.path.join(PROJECT_ROOT, 'seahub/templates'),
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.i18n',
                'django.template.context_processors.media',
                'django.template.context_processors.static',
                'django.template.context_processors.request',
                'django.contrib.messages.context_processors.messages',

                'seahub.auth.context_processors.auth',
                'seahub.base.context_processors.base',
                'seahub.base.context_processors.debug',
            ],
        },
    },
]


LANGUAGES = [
    # ('bg', gettext_noop(u'български език')),
    ('ca', 'Català'),
    ('cs', 'Čeština'),
    ('de', 'Deutsch'),
    ('en', 'English'),
    ('es', 'Español'),
    ('es-ar', 'Español de Argentina'),
    ('es-mx', 'Español de México'),
    ('fr', 'Français'),
    ('it', 'Italiano'),
    ('is', 'Íslenska'),
    ('lv', 'Latvian'),
    # ('mk', 'македонски јазик'),
    ('hu', 'Magyar'),
    ('nl', 'Nederlands'),
    ('pl', 'Polski'),
    ('pt-br', 'Portuguese, Brazil'),
    ('ru', 'Русский'),
    # ('sk', 'Slovak'),
    ('sl', 'Slovenian'),
    ('fi', 'Suomi'),
    ('sv', 'Svenska'),
    ('vi', 'Tiếng Việt'),
    ('tr', 'Türkçe'),
    ('uk', 'українська мова'),
    ('he', 'עברית'),
    ('ar', 'العربية'),
    ('el', 'ελληνικά'),
    ('th', 'ไทย'),
    ('ko', '한국어'),
    ('ja', '日本語'),
    # ('lt', 'Lietuvių kalba'),
    ('zh-cn', '简体中文'),
    ('zh-tw', '繁體中文'),
]

LOCALE_PATHS = [
    os.path.join(PROJECT_ROOT, 'locale'),
    os.path.join(PROJECT_ROOT, 'seahub/trusted_ip/locale'),
]

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # In order to overide command `createsuperuser`, base app *must* before auth app.
    # ref: https://docs.djangoproject.com/en/1.11/howto/custom-management-commands/#overriding-commands
    'seahub.base',
    'django.contrib.auth',

    'registration',
    'captcha',
    'statici18n',
    'constance',
    'constance.backends.database',
    'termsandconditions',
    'webpack_loader',
    'djangosaml2',

    'seahub.api2',
    'seahub.avatar',
    'seahub.contacts',
    'seahub.drafts',
    'seahub.institutions',
    'seahub.invitations',
    'seahub.wiki',
    'seahub.group',
    'seahub.notifications',
    'seahub.options',
    'seahub.onlyoffice',
    'seahub.profile',
    'seahub.share',
    'seahub.help',
    'seahub.thumbnail',
    'seahub.password_session',
    'seahub.admin_log',
    'seahub.wopi',
    'seahub.tags',
    'seahub.revision_tag',
    'seahub.two_factor',
    'seahub.role_permissions',
    'seahub.trusted_ip',
    'seahub.repo_tags',
    'seahub.file_tags',
    'seahub.related_files',
    'seahub.work_weixin',
    'seahub.dingtalk',
    'seahub.file_participants',
    'seahub.repo_api_tokens',
    'seahub.abuse_reports',
    'seahub.repo_auto_delete',
    'seahub.ocm',
    'seahub.ocm_via_webdav',
    'seahub.search',
    'seahub.sysadmin_extra',
    'seahub.organizations',
    'seahub.krb5_auth',
    'seahub.django_cas_ng',
    'seahub.seadoc',
]


# Enable or disable view File Scan
ENABLE_FILE_SCAN = False

# Enable or disable multiple storage backends.
ENABLE_STORAGE_CLASSES = False

# `USER_SELECT` or `ROLE_BASED` or `REPO_ID_MAPPING`
STORAGE_CLASS_MAPPING_POLICY = 'USER_SELECT'

# Enable or disable constance(web settings).
ENABLE_SETTINGS_VIA_WEB = True
CONSTANCE_BACKEND = 'constance.backends.database.DatabaseBackend'
CONSTANCE_DATABASE_CACHE_BACKEND = 'default'

AUTHENTICATION_BACKENDS = (
    'seahub.base.accounts.AuthBackend',
)

ENABLE_CAS = False

ENABLE_ADFS_LOGIN = False

ENABLE_MULTI_ADFS = False

ENABLE_OAUTH = False
ENABLE_WATERMARK = False

ENABLE_SHOW_CONTACT_EMAIL_WHEN_SEARCH_USER = False

# enable work weixin
ENABLE_WORK_WEIXIN = False

# enable weixin
ENABLE_WEIXIN = False

# enable dingtalk
ENABLE_DINGTALK = False

# enable ldap
ENABLE_LDAP = False
LDAP_USER_FIRST_NAME_ATTR = ''
LDAP_USER_LAST_NAME_ATTR = ''
LDAP_USER_NAME_REVERSE = False
LDAP_FILTER = ''
LDAP_CONTACT_EMAIL_ATTR = ''
LDAP_USER_ROLE_ATTR = ''
ACTIVATE_USER_WHEN_IMPORT = True

# enable ldap sasl auth
ENABLE_SASL = False
SASL_MECHANISM = ''
SASL_AUTHC_ID_ATTR = ''

# allow user to clean library trash
ENABLE_USER_CLEAN_TRASH = True

LOGIN_REDIRECT_URL = '/'
LOGIN_URL = '/accounts/login/'
LOGIN_ERROR_DETAILS = False
LOGOUT_REDIRECT_URL = None

ACCOUNT_ACTIVATION_DAYS = 7

# allow seafile admin view user's repo
ENABLE_SYS_ADMIN_VIEW_REPO = False

# allow seafile admin generate user auth token
ENABLE_SYS_ADMIN_GENERATE_USER_AUTH_TOKEN = False

# allow search from LDAP directly during auto-completion (not only search imported users)
ENABLE_SEARCH_FROM_LDAP_DIRECTLY = False

# show traffic on the UI
SHOW_TRAFFIC = True

# show or hide library 'download' button
SHOW_REPO_DOWNLOAD_BUTTON = False

# enable 'upload folder' or not
ENABLE_UPLOAD_FOLDER = True

# enable resumable fileupload or not
ENABLE_RESUMABLE_FILEUPLOAD = False
RESUMABLE_UPLOAD_FILE_BLOCK_SIZE = 8

## maxNumberOfFiles for fileupload
MAX_NUMBER_OF_FILES_FOR_FILEUPLOAD = 1000

# enable encrypt library
ENABLE_ENCRYPTED_LIBRARY = True
ENCRYPTED_LIBRARY_VERSION = 2

# enable reset encrypt library's password when user forget password
ENABLE_RESET_ENCRYPTED_REPO_PASSWORD = False

# mininum length for password of encrypted library
REPO_PASSWORD_MIN_LENGTH = 8

# token length for the share link
SHARE_LINK_TOKEN_LENGTH = 20

# if limit only authenticated user can view preview share link
SHARE_LINK_LOGIN_REQUIRED = False

# min/max expire days for a share link
SHARE_LINK_EXPIRE_DAYS_MIN = 0 # 0 means no limit
SHARE_LINK_EXPIRE_DAYS_MAX = 0 # 0 means no limit

# default expire days should be
# greater than or equal to MIN and less than or equal to MAX
SHARE_LINK_EXPIRE_DAYS_DEFAULT = 0

# min/max expire days for an upload link
UPLOAD_LINK_EXPIRE_DAYS_MIN = 0 # 0 means no limit
UPLOAD_LINK_EXPIRE_DAYS_MAX = 0 # 0 means no limit

# default expire days should be
# greater than or equal to MIN and less than or equal to MAX
UPLOAD_LINK_EXPIRE_DAYS_DEFAULT = 0

# force use password when generate a share/upload link
SHARE_LINK_FORCE_USE_PASSWORD = False

# mininum length for the password of a share/upload link
SHARE_LINK_PASSWORD_MIN_LENGTH = 10

# LEVEL for the password of a share/upload link
# based on four types of input:
# num, upper letter, lower letter, other symbols
# '3' means password must have at least 3 types of the above.
SHARE_LINK_PASSWORD_STRENGTH_LEVEL = 1

# enable or disable share link audit
ENABLE_SHARE_LINK_AUDIT = False

# enable or disable report abuse file on share link page
ENABLE_SHARE_LINK_REPORT_ABUSE = False

# share link audit code timeout
SHARE_LINK_AUDIT_CODE_TIMEOUT = 60 * 60

# enable or disable limit ip
ENABLE_LIMIT_IPADDRESS = False
TRUSTED_IP_LIST = ['127.0.0.1']

# Control the language that send email. Default to user's current language.
SHARE_LINK_EMAIL_LANGUAGE = ''

# check virus for files uploaded form upload link
ENABLE_UPLOAD_LINK_VIRUS_CHECK = False

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

# Enable a user to change password in 'settings' page.
ENABLE_CHANGE_PASSWORD = True

# Enable a user to get auth token in 'settings' page.
ENABLE_GET_AUTH_TOKEN_BY_SESSION = False

ENABLE_DELETE_ACCOUNT = True
ENABLE_UPDATE_USER_INFO = True

# Enable or disable repo history setting
ENABLE_REPO_HISTORY_SETTING = True

DISABLE_SYNC_WITH_ANY_FOLDER = False

ENABLE_TERMS_AND_CONDITIONS = False

# Enable or disable sharing to all groups
ENABLE_SHARE_TO_ALL_GROUPS = False

# Enable or disable sharing to departments
ENABLE_SHARE_TO_DEPARTMENT = True

# interval for request unread notifications
UNREAD_NOTIFICATIONS_REQUEST_INTERVAL = 3 * 60 # seconds

# Enable file comments
ENABLE_FILE_COMMENT = True

# Enable seafile docs
ENABLE_SEAFILE_DOCS = False

# File preview
FILE_PREVIEW_MAX_SIZE = 30 * 1024 * 1024
FILE_ENCODING_LIST = ['auto', 'utf-8', 'gbk', 'ISO-8859-1', 'ISO-8859-5']
FILE_ENCODING_TRY_LIST = ['utf-8', 'gbk']
HIGHLIGHT_KEYWORD = False # If True, highlight the keywords in the file when the visit is via clicking a link in 'search result' page.
# extensions of previewed files
TEXT_PREVIEW_EXT = """ac, am, bat, c, cc, cmake, cpp, cs, css, diff, el, h, html, htm, java, js, json, less, make, org, php, pl, properties, py, rb, scala, script, sh, sql, txt, text, tex, vi, vim, xhtml, xml, log, csv, groovy, rst, patch, go, yml"""

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
AUTO_GENERATE_AVATAR_SIZES = (16, 20, 24, 28, 32, 36, 40, 42, 48, 60, 64, 72, 80, 84, 96, 128, 160)
# Group avatar
GROUP_AVATAR_STORAGE_DIR = 'avatars/groups'
GROUP_AVATAR_DEFAULT_URL = 'avatars/groups/default.png'
AUTO_GENERATE_GROUP_AVATAR_SIZES = (20, 24, 32, 36, 48, 56)

LOG_DIR = os.environ.get('SEAHUB_LOG_DIR', '/tmp')
CACHE_DIR = "/tmp"
install_topdir = os.path.expanduser(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
central_conf_dir = os.environ.get('SEAFILE_CENTRAL_CONF_DIR', '')

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': os.path.join(CACHE_DIR, 'seahub_cache'),
        'OPTIONS': {
            'MAX_ENTRIES': 1000000
        }
    },

    # Compatible with existing `COMPRESS_CACHE_BACKEND` setting after
    # upgrading to django-compressor v2.2.
    # ref: https://manual.seafile.com/deploy_pro/deploy_in_a_cluster.html
    'django.core.cache.backends.locmem.LocMemCache': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    },
}

# rest_framwork
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'ping': '3000/minute',
        'anon': '60/minute',
        'user': '3000/minute',
    },
    # https://github.com/tomchristie/django-rest-framework/issues/2891
    'UNICODE_JSON': False,
}
REST_FRAMEWORK_THROTTING_WHITELIST = []

# file and path
GET_FILE_HISTORY_TIMEOUT = 10 * 60 # seconds
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

# Whether or not send notify email to sytem admins when user registered or
# first login through Shibboleth.
NOTIFY_ADMIN_AFTER_REGISTRATION = False

# Whether or not activate inactive user on first login. Mainly used in LDAP user sync.
ACTIVATE_AFTER_FIRST_LOGIN = False

REQUIRE_DETAIL_ON_REGISTRATION = False

# Account initial password, for password resetting.
# INIT_PASSWD can either be a string, or a function (function has to be set without the brackets)
def genpassword():
    from django.utils.crypto import get_random_string
    return get_random_string(10)
INIT_PASSWD = genpassword

# browser tab title
SITE_TITLE = 'Private Seafile'

# html head meta tag for search engine preview text
SITE_DESCRIPTION = ''

# Base name used in email sending
SITE_NAME = 'Seafile'

# Path to the license file(relative to the media path)
LICENSE_PATH = os.path.join(PROJECT_ROOT, '../../seafile-license.txt')

# Path to the background image file of login page(relative to the media path)
LOGIN_BG_IMAGE_PATH = 'img/login-bg.jpg'

# Path to the favicon file (relative to the media path)
# tip: use a different name when modify it.
FAVICON_PATH = 'favicons/favicon.png'
APPLE_TOUCH_ICON_PATH = 'favicons/favicon.png'

# Path to the Logo Imagefile (relative to the media path)
LOGO_PATH = 'img/seafile-logo.png'
# logo size. the unit is 'px'
LOGO_WIDTH = ''
LOGO_HEIGHT = 32

CUSTOM_LOGO_PATH = 'custom/mylogo.png'
CUSTOM_FAVICON_PATH = 'custom/favicon.ico'
CUSTOM_LOGIN_BG_PATH = 'custom/login-bg.jpg'

# used before version 6.3: the relative path of css file under seahub-data (e.g. custom/custom.css)
BRANDING_CSS = ''

# used in 6.3+, enable setting custom css via admin web interface
ENABLE_BRANDING_CSS = False

# Using Django to server static file. Set to `False` if deployed behide a web
# server.
SERVE_STATIC = True

# Enable or disable registration on web.
ENABLE_SIGNUP = False

# show 'log out' icon in top-bar or not.
SHOW_LOGOUT_ICON = False

# privacy policy link and service link
PRIVACY_POLICY_LINK = ''
TERMS_OF_SERVICE_LINK = ''

# For security consideration, please set to match the host/domain of your site, e.g., ALLOWED_HOSTS = ['.example.com'].
# Please refer https://docs.djangoproject.com/en/dev/ref/settings/#allowed-hosts for details.
ALLOWED_HOSTS = ['*']

# Logging
LOGGING = {
    'version': 1,

    # Enable existing loggers so that gunicorn errors will be bubbled up when
    # server side error page "Internal Server Error" occurs.
    # ref: https://www.caktusgroup.com/blog/2015/01/27/Django-Logging-Configuration-logging_config-default-settings-logger/
    'disable_existing_loggers': False,

    'formatters': {
        'standard': {
            'format': '%(asctime)s [%(levelname)s] %(name)s:%(lineno)s %(funcName)s %(message)s'
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue'
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
        },
        'default': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOG_DIR, 'seahub.log'),
            'maxBytes': 1024*1024*100,  # 100 MB
            'backupCount': 5,
            'formatter': 'standard',
        },
        'onlyoffice_handler': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOG_DIR, 'onlyoffice.log'),
            'maxBytes': 1024*1024*100,  # 100 MB
            'backupCount': 5,
            'formatter': 'standard',
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
            'handlers': ['default', 'mail_admins'],
            'level': 'INFO',
            'propagate': False
        },
        'py.warnings': {
            'handlers': ['console', ],
            'level': 'INFO',
            'propagate': False
        },
        'onlyoffice': {
            'handlers': ['onlyoffice_handler', ],
            'level': 'INFO',
            'propagate': False
        },
    }
}

#Login Attempt
LOGIN_ATTEMPT_LIMIT = 5
LOGIN_ATTEMPT_TIMEOUT = 15 * 60 # in seconds (default: 15 minutes)
FREEZE_USER_ON_LOGIN_FAILED = False # deactivate user account when login attempts exceed limit

# Age of cookie, in seconds (default: 1 day).
SESSION_COOKIE_AGE = 24 * 60 * 60

# Days of remembered login info (deafult: 7 days)
LOGIN_REMEMBER_DAYS = 7

SEAFILE_VERSION = '6.3.3'

CAPTCHA_IMAGE_SIZE = (90, 42)

###################
# Image Thumbnail #
###################

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
THUMBNAIL_SIZE_FOR_ORIGINAL = 1024

# size(MB) limit for generate thumbnail
THUMBNAIL_IMAGE_SIZE_LIMIT = 30
THUMBNAIL_IMAGE_ORIGINAL_SIZE_LIMIT = 256

# video thumbnails
ENABLE_VIDEO_THUMBNAIL = False
THUMBNAIL_VIDEO_FRAME_TIME = 5  # use the frame at 5 second as thumbnail

# template for create new office file
OFFICE_TEMPLATE_ROOT = os.path.join(MEDIA_ROOT, 'office-template')

ENABLE_WEBDAV_SECRET = False
WEBDAV_SECRET_MIN_LENGTH = 1
WEBDAV_SECRET_STRENGTH_LEVEL = 1

ENABLE_USER_SET_CONTACT_EMAIL = False

# SSO to thirdparty website
ENABLE_SSO_TO_THIRDPART_WEBSITE = False
THIRDPART_WEBSITE_SECRET_KEY = ''
THIRDPART_WEBSITE_URL = ''

#####################
# Global AddressBook #
#####################
ENABLE_GLOBAL_ADDRESSBOOK = True
ENABLE_ADDRESSBOOK_OPT_IN = False

####################
# Guest Invite     #
####################
ENABLE_GUEST_INVITATION = False
INVITATION_ACCEPTER_BLACKLIST = []

########################
# Security Enhancements #
########################

ENABLE_SUDO_MODE = True
FILESERVER_TOKEN_ONCE_ONLY = True

#################
# Email sending #
#################

SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER = True # Whether to send email when a system staff adding new member.
SEND_EMAIL_ON_RESETTING_USER_PASSWD = True # Whether to send email when a system staff resetting user's password.

##########################
# Settings for Extra App #
##########################

##########################
# Settings for frontend  #
##########################

SEAFILE_COLLAB_SERVER = ''

##########################
# Settings for dtable web  #
##########################

DTABLE_WEB_SERVER = ''

##########################
# Settings for seadoc    #
##########################

ENABLE_SEADOC = False
SEADOC_PRIVATE_KEY = ''
SEADOC_SERVER_URL = 'http://127.0.0.1:7070'


############################
# Settings for Seahub Priv #
############################

# Replace from email to current user instead of email sender.
REPLACE_FROM_EMAIL = False

# Add ``Reply-to`` header, see RFC #822.
ADD_REPLY_TO_HEADER = False

ENABLE_DEMO_USER = False
CLOUD_DEMO_USER = 'demo@seafile.com'

ENABLE_TWO_FACTOR_AUTH = False
OTP_LOGIN_URL = '/profile/two_factor_authentication/setup/'
TWO_FACTOR_DEVICE_REMEMBER_DAYS = 90
ENABLE_FORCE_2FA_TO_ALL_USERS = False

# Enable wiki
ENABLE_WIKI = True

# Enable 'repo snapshot label' feature
ENABLE_REPO_SNAPSHOT_LABEL = False

#  Repo wiki mode
ENABLE_REPO_WIKI_MODE = True

############################
# HU berlin additional #
############################

# ADDITIONAL_SHARE_DIALOG_NOTE = {
#     'title': 'Attention! Read before shareing files:',
#     'content': 'Do not share personal or confidential official data with **.'
# }
ADDITIONAL_SHARE_DIALOG_NOTE = None

# ADDITIONAL_APP_BOTTOM_LINKS = {
#     'seafile': 'http://dev.seahub.com/seahub',
#     'dtable-web': 'http://dev.seahub.com/dtable-web'
# }
ADDITIONAL_APP_BOTTOM_LINKS = None

# ADDITIONAL_ABOUT_DIALOG_LINKS = {
#     'seafile': 'http://dev.seahub.com/seahub',
#     'dtable-web': 'http://dev.seahub.com/dtable-web'
# }
ADDITIONAL_ABOUT_DIALOG_LINKS = None

############################
# Settings for SeafileDocs #
############################
if os.environ.get('SEAFILE_DOCS', None):
    LOGO_PATH = 'img/seafile-docs-logo.png'
    LOGO_WIDTH = ''
    ENABLE_WIKI = True

######################
# ledger dtable-web  #
######################
DTABLE_WEB_LEDGER_API_TOKEN = ''
LEDGER_TABLE_NAME = 'ledgers'

#################
# seafevents io #
#################
SEAFEVENTS_IO_SERVER = 'http://127.0.0.1:6000'
SEAFEVENTS_IO_SERVER_AUTH_TOKEN = 'zNe9ZMrhzqa5tU~!$u+R'

d = os.path.dirname
EVENTS_CONFIG_FILE = os.environ.get(
    'EVENTS_CONFIG_FILE',
    os.path.join(
        d(d(d(d(os.path.abspath(__file__))))), 'conf', 'seafevents.conf'
    )
)

del d
if not os.path.exists(EVENTS_CONFIG_FILE):
    del EVENTS_CONFIG_FILE

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

    # In server release, gunicorn is used to deploy seahub
    INSTALLED_APPS.append('gunicorn')

    load_local_settings(seahub_settings)
    del seahub_settings

# Remove install_topdir from path
sys.path.pop(0)

# Following settings are private, can not be overwrite.
INNER_FILE_SERVER_ROOT = 'http://127.0.0.1:' + FILE_SERVER_PORT

CONSTANCE_ENABLED = ENABLE_SETTINGS_VIA_WEB
CONSTANCE_CONFIG = {
    'SERVICE_URL': (SERVICE_URL, ''),
    'FILE_SERVER_ROOT': (FILE_SERVER_ROOT, ''),
    'DISABLE_SYNC_WITH_ANY_FOLDER': (DISABLE_SYNC_WITH_ANY_FOLDER, ''),

    'ENABLE_SIGNUP': (ENABLE_SIGNUP, ''),
    'ACTIVATE_AFTER_REGISTRATION': (ACTIVATE_AFTER_REGISTRATION, ''),
    'REGISTRATION_SEND_MAIL': (REGISTRATION_SEND_MAIL, ''),
    'LOGIN_REMEMBER_DAYS': (LOGIN_REMEMBER_DAYS, ''),
    'LOGIN_ATTEMPT_LIMIT': (LOGIN_ATTEMPT_LIMIT, ''),
    'FREEZE_USER_ON_LOGIN_FAILED': (FREEZE_USER_ON_LOGIN_FAILED, ''),

    'ENABLE_ENCRYPTED_LIBRARY': (ENABLE_ENCRYPTED_LIBRARY, ''),
    'REPO_PASSWORD_MIN_LENGTH': (REPO_PASSWORD_MIN_LENGTH, ''),
    'ENABLE_REPO_HISTORY_SETTING': (ENABLE_REPO_HISTORY_SETTING, ''),
    'FORCE_PASSWORD_CHANGE': (FORCE_PASSWORD_CHANGE, ''),

    'USER_STRONG_PASSWORD_REQUIRED': (USER_STRONG_PASSWORD_REQUIRED, ''),
    'USER_PASSWORD_MIN_LENGTH': (USER_PASSWORD_MIN_LENGTH, ''),
    'USER_PASSWORD_STRENGTH_LEVEL': (USER_PASSWORD_STRENGTH_LEVEL, ''),

    'SHARE_LINK_TOKEN_LENGTH': (SHARE_LINK_TOKEN_LENGTH, ''),
    'SHARE_LINK_FORCE_USE_PASSWORD': (SHARE_LINK_FORCE_USE_PASSWORD, ''),
    'SHARE_LINK_PASSWORD_MIN_LENGTH': (SHARE_LINK_PASSWORD_MIN_LENGTH, ''),
    'SHARE_LINK_PASSWORD_STRENGTH_LEVEL': (SHARE_LINK_PASSWORD_STRENGTH_LEVEL, ''),
    'ENABLE_TWO_FACTOR_AUTH': (ENABLE_TWO_FACTOR_AUTH, ''),

    'TEXT_PREVIEW_EXT': (TEXT_PREVIEW_EXT, ''),
    'ENABLE_SHARE_TO_ALL_GROUPS': (ENABLE_SHARE_TO_ALL_GROUPS, ''),

    'SITE_NAME': (SITE_NAME, ''),
    'SITE_TITLE': (SITE_TITLE, ''),

    'ENABLE_BRANDING_CSS': (ENABLE_BRANDING_CSS, ''),
    'CUSTOM_CSS': ('', ''),

    'ENABLE_TERMS_AND_CONDITIONS': (ENABLE_TERMS_AND_CONDITIONS, ''),
    'ENABLE_USER_CLEAN_TRASH': (ENABLE_USER_CLEAN_TRASH, ''),
}

# if Seafile admin enable remote user authentication in conf/seahub_settings.py
# then add 'seahub.auth.middleware.SeafileRemoteUserMiddleware' and
# 'seahub.auth.backends.SeafileRemoteUserBackend' to settings.
if ENABLE_REMOTE_USER_AUTHENTICATION:
    MIDDLEWARE.append('seahub.auth.middleware.SeafileRemoteUserMiddleware')
    AUTHENTICATION_BACKENDS += ('seahub.auth.backends.SeafileRemoteUserBackend',)

if ENABLE_OAUTH or ENABLE_WORK_WEIXIN or ENABLE_WEIXIN or ENABLE_DINGTALK:
    AUTHENTICATION_BACKENDS += ('seahub.oauth.backends.OauthRemoteUserBackend',)

if ENABLE_CAS:
    AUTHENTICATION_BACKENDS += ('seahub.django_cas_ng.backends.CASBackend',)

if ENABLE_ADFS_LOGIN or ENABLE_MULTI_ADFS:
    MIDDLEWARE.append('djangosaml2.middleware.SamlSessionMiddleware')
    AUTHENTICATION_BACKENDS += ('seahub.adfs_auth.backends.Saml2Backend',)
    SAML_CONFIG_LOADER = 'seahub.adfs_auth.utils.config_settings_loader'

if ENABLE_LDAP:
    AUTHENTICATION_BACKENDS += ('seahub.base.accounts.CustomLDAPBackend',)

#####################
# Custom Nav Items  #
#####################
# an example:
# CUSTOM_NAV_ITEMS = [
#     {'icon': 'sf2-icon-star',
#      'desc': 'test custom name',
#      'link': 'http://127.0.0.1:8000/shared-libs/',
#      },
# ]

# settings.py



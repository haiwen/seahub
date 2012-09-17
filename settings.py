# Django settings for seahub project.
import os

DEBUG = False
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    # ('Your Name', 'your_email@domain.com'),
)

MANAGERS = ADMINS

DATABASE_ENGINE = 'sqlite3'           # 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
DATABASE_NAME = os.path.join(os.path.dirname(__file__), 'seahub.db')             # Or path to database file if using sqlite3.
DATABASE_USER = ''             # Not used with sqlite3.
DATABASE_PASSWORD = ''         # Not used with sqlite3.
DATABASE_HOST = ''             # Set to empty string for localhost. Not used with sqlite3.
DATABASE_PORT = ''             # Set to empty string for default. Not used with sqlite3.

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'Asia/Shanghai'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'zh_CN'

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
    'django.contrib.messages.middleware.MessageMiddleware',    
    'auth.middleware.AuthenticationMiddleware',
    'base.middleware.BaseMiddleware',    
    'base.middleware.InfobarMiddleware',
    'seahub.subdomain.middleware.SubdomainMiddleware',
)

SITE_ROOT_URLCONF = 'seahub.urls'
ROOT_URLCONF = 'djblets.util.rooturl'
 
SITE_ROOT = '/'

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(os.path.dirname(__file__), "templates"),
    os.path.join(os.path.dirname(__file__),'thirdpart/djangorestframework/templates'),
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
#    'seahub.organizations.context_processors.org',
)


INSTALLED_APPS = (
    'django.contrib.contenttypes',
    'django.contrib.sessions',
#    'django.contrib.sites',
#    'django.contrib.admin',
    'django.contrib.messages',
    
    # 'auth',
    'avatar',    
    'registration',

    'seahub.base',
    'seahub.contacts',
    'seahub.group',    
    'seahub.notifications',
    'seahub.organizations',
    'seahub.profile',
    'seahub.share',
    'seahub.subdomain',
    'seahub.api',
)

AUTHENTICATION_BACKENDS = (
    'auth.backends.ModelBackend',
)

ACCOUNT_ACTIVATION_DAYS = 7

# Add supported file extensions and file icon name.
# Icons will show in repo page.
FILEEXT_ICON_MAP = {
    # pdf file
    'pdf' : 'pdf.png',
    # document file
    'doc' : 'ms-word.png',
    'docx' : 'ms-word.png',
    'ppt' : 'ms-ppt.png',
    'pptx' : 'ms-ppt.png',
    'xls' : 'ms-excel.png',
    'xlsx' : 'ms-excel.png',
    'txt' : 'txt.png',
    'odf' : 'odf.png',
    # music file
    'mp3' : 'music-icon-24.png',
    # picture file
    'jpg' : 'pic-icon-24.png',
    'jpeg' : 'pic-icon-24.png',
    'png' : 'pic-icon-24.png',
    'svg' : 'pic-icon-24.png',
    'gif' : 'pic-icon-24.png',
    'bmp' : 'pic-icon-24.png',
    # normal file and unkown file
    'default' : 'file-icon-24.png',
}

# File preview
FILE_PREVIEW_MAX_SIZE = 10 * 1024 * 1024

# Avatar
AVATAR_STORAGE_DIR = 'avatars'
GROUP_AVATAR_STORAGE_DIR = 'avatars/groups'
AVATAR_GRAVATAR_BACKUP = False
AVATAR_DEFAULT_URL = '/avatars/default.jpg'
GROUP_AVATAR_DEFAULT_URL = 'avatars/groups/default.png'
AVATAR_MAX_AVATARS_PER_USER = 1
AVATAR_CACHE_TIMEOUT = 24 * 60 * 60
AVATAR_ALLOWED_FILE_EXTS = ('.jpg', '.png', '.jpeg', '.gif')
AUTO_GENERATE_AVATAR_SIZES = (16, 28, 48, 60, 80)

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': '/tmp/seahub_cache',
    }
}

MAX_UPLOAD_FILE_SIZE        = 100 * 1024 * 1024 # 100 MB
MAX_UPLOAD_FILE_NAME_LEN    = 256

# Base url and name used in email sending
SITE_BASE = 'http://gonggeng.org/'
SITE_NAME = 'gonggeng'

# Set to True when user will be activaed after registration,
# and no email sending
ACTIVATE_AFTER_REGISTRATION = True

# In order to use email sending,
# ACTIVATE_AFTER_REGISTRATION MUST set to False
REGISTRATION_SEND_MAIL = False

# Seafile httpserver address and port
HTTP_SERVER_ROOT = "http://localhost:8082"

# Seafile-applet address and port, used in repo download
CCNET_APPLET_ROOT = "http://localhost:13420"

# Account initial password, for password resetting.
INIT_PASSWD = '123456'

SEAHUB_TITLE = 'SeaHub'

USE_SUBDOMAIN = False

try:
    import local_settings
except ImportError:
    pass
else:
  # Import any symbols that begin with A-Z. Append to lists any symbols that
  # begin with "EXTRA_".
    import re
    for attr in dir(local_settings):
        match = re.search('^EXTRA_(\w+)', attr)
        if match:
            name = match.group(1)
            value = getattr(local_settings, attr)
            try:
                globals()[name] += value
            except KeyError:
                globals()[name] = value
        elif re.search('^[A-Z]', attr):
            globals()[attr] = getattr(local_settings, attr)

LOGIN_URL = SITE_ROOT + 'accounts/login'

USER_TOTAL_SPACE = 2 * pow(2,30)

SEAFILE_VERSION = '1.0.0'

import os
import sys
import logging
import configparser

logger = logging.getLogger(__name__)

# SEAHUB_DIR
SEAHUB_DIR = os.environ.get('SEAHUB_DIR', '')
if not SEAHUB_DIR:
    logging.critical('SEAHUB_DIR is not set')
    raise RuntimeError('SEAHUB_DIR is not set')
if not os.path.exists(SEAHUB_DIR):
    logging.critical('SEAHUB_DIR %s does not exist' % SEAHUB_DIR)
    raise RuntimeError('SEAHUB_DIR does not exist.')
sys.path.insert(0, SEAHUB_DIR)

try:
    import seahub.settings as seahub_settings
    TIME_ZONE = getattr(seahub_settings, 'TIME_ZONE', 'UTC')
    SEAHUB_SECRET_KEY = getattr(seahub_settings, 'SECRET_KEY', '')
    JWT_PRIVATE_KEY = getattr(seahub_settings, 'JWT_PRIVATE_KEY', '')
    METADATA_FILE_TYPES = getattr(seahub_settings, 'METADATA_FILE_TYPES', {})
    DOWNLOAD_LIMIT_WHEN_THROTTLE = getattr(seahub_settings, 'DOWNLOAD_LIMIT_WHEN_THROTTLE', '1k')
    UPLOAD_LIMIT_WHEN_THROTTLE = getattr(seahub_settings, 'UPLOAD_LIMIT_WHEN_THROTTLE', '1k')
    ENABLED_ROLE_PERMISSIONS = getattr(seahub_settings, 'ENABLED_ROLE_PERMISSIONS', {})
    BAIDU_MAP_KEY = getattr(seahub_settings, 'BAIDU_MAP_KEY', '')
    BAIDU_MAP_URL = getattr(seahub_settings, 'BAIDU_MAP_URL', '')
    SERVER_GOOGLE_MAP_KEY = getattr(seahub_settings, 'SERVER_GOOGLE_MAP_KEY', '')
    GOOGLE_MAP_GEOCODE_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
    ENABLE_SEAFILE_AI = getattr(seahub_settings, 'ENABLE_SEAFILE_AI', False)
    SEAFILE_AI_SECRET_KEY = getattr(seahub_settings, 'SEAFILE_AI_SECRET_KEY', '')
    SEAFILE_AI_SERVER_URL = getattr(seahub_settings, 'SEAFILE_AI_SERVER_URL', '')
    INNER_FILE_SERVER_ROOT = getattr(seahub_settings, 'INNER_FILE_SERVER_ROOT', '')
    FILE_SERVER_ROOT = getattr(seahub_settings, 'FILE_SERVER_ROOT', '')
    FILE_CONVERTER_SERVER_URL = getattr(seahub_settings, 'FILE_CONVERTER_SERVER_URL', '')
    SEADOC_PRIVATE_KEY = getattr(seahub_settings, 'SEADOC_PRIVATE_KEY', '')
    ORG_MEMBER_QUOTA_ENABLED = getattr(seahub_settings, 'ORG_MEMBER_QUOTA_ENABLED', False)
    ORG_MEMBER_QUOTA_DEFAULT = getattr(seahub_settings, 'ORG_MEMBER_QUOTA_DEFAULT', 10)
except ImportError:
    logger.critical("Can not import seahub settings.")
    raise RuntimeError("Can not import seahub settings.")

################## config from env ################################

## config for metadata
METADATA_SERVER_URL = os.environ.get('INNER_METADATA_SERVER_URL', '') or 'http://127.0.0.1:8084'
ENABLE_METADATA_MANAGEMENT = os.environ.get('ENABLE_METADATA_MANAGEMENT', 'false').lower() == 'true'

## config for redis
REDIS_HOST = os.environ.get('REDIS_HOST', '')
REDIS_PORT = os.environ.get('REDIS_PORT', '')
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', '')

# config for memcached
MEMCACHED_HOST = os.environ.get('MEMCACHED_HOST', '')
MEMCACHED_PORT = os.environ.get('MEMCACHED_PORT', '')

# config for cache provider, choices: redis or memcached
CACHE_PROVIDER = os.environ.get('CACHE_PROVIDER', 'memcached')


# config for mysql
MYSQL_DB_HOST = os.environ.get('SEAFILE_MYSQL_DB_HOST', 'db')
MYSQL_DB_PORT = int(os.environ.get('SEAFILE_MYSQL_DB_PORT', 3306))
MYSQL_DB_USER = os.environ.get('SEAFILE_MYSQL_DB_USER', 'root')
MYSQL_DB_PWD = os.environ.get('SEAFILE_MYSQL_DB_PASSWORD', '')
MYSQL_SEAHUB_DB_NAME = os.environ.get('SEAFILE_MYSQL_DB_SEAHUB_DB_NAME', 'seahub_db')
MYSQL_SEAFILE_DB_NAME = os.environ.get('SEAFILE_MYSQL_DB_SEAFILE_DB_NAME', 'seafile_db')
MYSQL_CCNET_DB_NAME = os.environ.get('SEAFILE_MYSQL_DB_CCNET_DB_NAME', 'ccnet_db')

# config for seafile edition
IS_PRO_VERSION = os.environ.get('IS_PRO_VERSION', 'false') == 'true'

################## config from env ################################


def get_config(config_file):
    config = configparser.ConfigParser(inline_comment_prefixes=('#', ';'))
    try:
        config.read(config_file)
    except Exception as e:
        logger.critical("Failed to read config file %s: %s" % (config_file, e))
        raise RuntimeError("Failed to read config file %s: %s" % (config_file, e))

    return config


def is_syslog_enabled(config):
    if config.has_option('Syslog', 'enabled'):
        try:
            return config.getboolean('Syslog', 'enabled')
        except ValueError:
            return False
    return False

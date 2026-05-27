import os
import logging
import atexit
import configparser
import subprocess
import datetime
import pytz
from seahub_io.app.config import TIME_ZONE

logger = logging.getLogger(__name__)


def write_pidfile(pidfile):
    pid = os.getpid()
    with open(pidfile, 'w') as fp:
        fp.write(str(pid))

    def remove_pidfile():
        # Remove the pidfile when exit
        logger.info('remove pidfile %s' % pidfile)
        try:
            os.remove(pidfile)
        except Exception as e:
            logger.error(e)
            pass

    atexit.register(remove_pidfile)


def run(argv, cwd=None, env=None, suppress_stdout=False, suppress_stderr=False, output=None):
    def quote(args):
        return ' '.join(['"%s"' % arg for arg in args])

    cmdline = quote(argv)
    if cwd:
        logger.debug('Running command: %s, cwd = %s', cmdline, cwd)
    else:
        logger.debug('Running command: %s', cmdline)

    with open(os.devnull, 'w') as devnull:
        kwargs = dict(cwd=cwd, env=env, shell=True)

        if suppress_stdout:
            kwargs['stdout'] = devnull
        if suppress_stderr:
            kwargs['stderr'] = devnull

        if output:
            kwargs['stdout'] = output
            kwargs['stderr'] = output

        return subprocess.Popen(cmdline, **kwargs)


def run_and_wait(argv, cwd=None, env=None, suppress_stdout=False, suppress_stderr=False, output=None):
    proc = run(argv, cwd, env, suppress_stdout, suppress_stderr, output)
    return proc.wait()


def get_opt_from_conf_or_env(config, section, key, env_key=None, default=None):
    """Get option value from events.conf. If not specified in events.conf, check the environment variable.
    """
    try:
        return config.get(section, key)
    except configparser.Error:
        if env_key is None:
            return default
        else:
            return os.environ.get(env_key.upper(), default)


def parse_bool(v):
    if isinstance(v, bool):
        return v

    v = str(v).lower()

    if v == '1' or v == 'true':
        return True
    else:
        return False


def timestamp_to_isoformat_timestr(timestamp):
    try:
        min_ts = -(1 << 31)
        max_ts = (1 << 31) - 1
        if min_ts <= timestamp <= max_ts:
            dt_obj = datetime.datetime.fromtimestamp(timestamp)
        else:
            dt_obj = datetime.datetime.fromtimestamp(timestamp / 1000000)

        dt_obj = dt_obj.replace(microsecond=0)
        target_timezone = pytz.timezone(TIME_ZONE)
        aware_datetime = target_timezone.localize(dt=dt_obj)

        localized_datetime = target_timezone.normalize(aware_datetime.astimezone(pytz.UTC))
        isoformat_timestr = localized_datetime.isoformat()
        return isoformat_timestr
    except Exception as e:
        logger.error(e)
        return ''

UNIT_KB = 'kb'
UNIT_MB = 'mb'
UNIT_GB = 'gb'
UNIT_TB = 'tb'
UNIT_PB = 'pb'

UNIT_KIB = 'kib'
UNIT_MIB = 'mib'
UNIT_GIB = 'gib'
UNIT_TIB = 'tib'
UNIT_PIB = 'pib'

def get_file_size_unit(unit_type):
    """
    File size unit according to https://en.wikipedia.org/wiki/Kibibyte.
    """
    table = {
        # decimal
        UNIT_KB: 10 ** 3,
        UNIT_MB: 10 ** 6,
        UNIT_GB: 10 ** 9,
        UNIT_TB: 10 ** 12,
        UNIT_PB: 10 ** 15,
        # binary
        UNIT_KIB: 1 << 10,
        UNIT_MIB: 1 << 20,
        UNIT_GIB: 1 << 30,
        UNIT_TIB: 1 << 40,
        UNIT_PIB: 1 << 50,
    }

    unit_type = unit_type.lower()
    if unit_type not in list(table.keys()):
        raise TypeError('Invalid unit type')

    return table.get(unit_type)

def get_quota_from_string(quota_str):
    quota_str = quota_str.lower()
    if quota_str.endswith('g'):
        quota = int(quota_str[:-1]) * get_file_size_unit('gb')
    elif quota_str.endswith('m'):
        quota = int(quota_str[:-1]) * get_file_size_unit('mb')
    elif quota_str.endswith('k'):
        quota = int(quota_str[:-1]) * get_file_size_unit('kb')
    else:
        return None

    return quota

# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import pytz
import datetime
from django.conf import settings
from django.utils import six
from django.utils import timezone

logger = logging.getLogger(__name__)

def dt(value):
    """Convert 32/64 bits timestamp to datetime object.
    """
    try:
        return datetime.datetime.utcfromtimestamp(value)
    except ValueError:
        # TODO: need a better way to handle 64 bits timestamp.
        return datetime.datetime.utcfromtimestamp(value/1000000)

def value_to_db_datetime(value):
    if value is None:
        return None

    # MySQL doesn't support tz-aware datetimes
    if timezone.is_aware(value):
        if settings.USE_TZ:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        else:
            raise ValueError("MySQL backend does not support timezone-aware datetimes when USE_TZ is False.")

    # MySQL doesn't support microseconds
    return six.text_type(value.replace(microsecond=0))

def utc_to_local(dt):
    # change from UTC timezone to current seahub timezone
    tz = timezone.get_default_timezone()
    utc = dt.replace(tzinfo=timezone.utc)
    local = timezone.make_naive(utc, tz)
    return local

pytz_obj = pytz.timezone(settings.TIME_ZONE)
def timestamp_to_isoformat_timestr(timestamp):
    try:
        min_ts = -(1 << 31)
        max_ts = (1 << 31) - 1
        if min_ts <= timestamp <= max_ts:
            dt_obj = datetime.datetime.fromtimestamp(timestamp)
        else:
            dt_obj = datetime.datetime.fromtimestamp(timestamp/1000000)

        dt_obj = dt_obj.replace(microsecond=0)
        isoformat_timestr = pytz_obj.localize(dt_obj).isoformat()
        return isoformat_timestr
    except Exception as e:
        logger.error(e)
        return ''

def datetime_to_isoformat_timestr(datetime):
    try:
        datetime = datetime.replace(microsecond=0)
        isoformat_timestr = pytz_obj.localize(datetime).isoformat()
        return isoformat_timestr
    except Exception as e:
        logger.error(e)
        return ''

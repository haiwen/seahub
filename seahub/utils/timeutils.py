import datetime
from django.conf import settings
from django.utils import six
from django.utils import timezone

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

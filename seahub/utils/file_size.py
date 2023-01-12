# Copyright (c) 2012-2016 Seafile Ltd.

import logging
logger = logging.getLogger(__name__)

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
    else:
        return None

    return quota


def byte_to_kb(byte):

    if byte < 0:
        return ''

    try:
        unit = get_file_size_unit(UNIT_KB)
        return round(float(byte)/unit, 2)
    except Exception as e:
        logger.error(e)
        return ''


def byte_to_mb(byte):

    if byte < 0:
        return ''

    try:
        unit = get_file_size_unit(UNIT_MB)
        return round(float(byte)/unit, 2)
    except Exception as e:
        logger.error(e)
        return ''

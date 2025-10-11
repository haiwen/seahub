# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import datetime as dt
from datetime import datetime
import re

import pytz
from django import template
from django.core.cache import cache
from django.utils.safestring import mark_safe
from django.utils import translation, formats
from django.utils.dateformat import DateFormat
from django.utils.translation import gettext as _
from django.utils.translation import gettext, ngettext
from django.utils.timezone import get_current_timezone
from django.utils.html import escape

from seahub.base.accounts import User
from seahub.profile.models import Profile
from seahub.profile.settings import NICKNAME_CACHE_TIMEOUT, NICKNAME_CACHE_PREFIX, \
    EMAIL_ID_CACHE_TIMEOUT, EMAIL_ID_CACHE_PREFIX, CONTACT_CACHE_TIMEOUT, \
    CONTACT_CACHE_PREFIX, LOGIN_ID_CACHE_PREFIX, LOGIN_ID_CACHE_TIMEOUT
from seahub.cconvert import CConvert
from seahub.settings import TIME_ZONE
from seahub.shortcuts import get_first_object_or_none
from seahub.utils import normalize_cache_key, CMMT_DESC_PATT
from seahub.utils.html import avoid_wrapping
from seahub.utils.file_size import get_file_size_unit

register = template.Library()
current_timezone = get_current_timezone()


@register.filter(name='tsstr_sec')
def tsstr_sec(value):
    """Turn a timestamp to string"""
    try:
        return datetime.fromtimestamp(value).strftime("%Y-%m-%d %H:%M:%S")
    except:
        return datetime.fromtimestamp(value/1000000).strftime("%Y-%m-%d %H:%M:%S")

@register.filter(name='tsstr_day')
def tsstr_day(value):
    """Turn a timestamp to string"""
    try:
        return datetime.fromtimestamp(value).strftime("%Y-%m-%d")
    except:
        return datetime.fromtimestamp(value/1000000).strftime("%Y-%m-%d")

# Supported file extensions and file icon name.
FILEEXT_ICON_MAP = {

    # text file
    'md': 'txt.png',
    'txt': 'txt.png',

    # pdf file
    'pdf': 'pdf.png',

    # document file
    'doc': 'word.png',
    'docx': 'word.png',
    'odt': 'word.png',
    'fodt': 'word.png',

    'ppt': 'ppt.png',
    'pptx': 'ppt.png',
    'odp': 'ppt.png',
    'fodp': 'ppt.png',

    'xls': 'excel.png',
    'xlsx': 'excel.png',
    'ods': 'excel.png',
    'fods': 'excel.png',

    # video
    'mp4': 'video.png',
    'ogv': 'video.png',
    'webm': 'video.png',
    'mov': 'video.png',
    'flv': 'video.png',
    'wmv': 'video.png',
    'rmvb': 'video.png',

    # music file
    'mp3': 'music.png',
    'oga': 'music.png',
    'ogg': 'music.png',
    'flac': 'music.png',
    'aac': 'music.png',
    'ac3': 'music.png',
    'wma': 'music.png',

    # image file
    'jpg': 'pic.png',
    'jpeg': 'pic.png',
    'png': 'pic.png',
    'svg': 'pic.png',
    'gif': 'pic.png',
    'bmp': 'pic.png',
    'ico': 'pic.png',

    # default
    'default': 'file.png',
}
@register.filter(name='file_icon_filter')
def file_icon_filter(value, size=None):
    """Get file icon according to the file postfix"""
    if value.rfind('.') > 0:
        file_ext = value.split('.')[-1].lower()
    else:
        file_ext = None

    if file_ext and file_ext in FILEEXT_ICON_MAP:
        if size == 192:
            return '192/' + FILEEXT_ICON_MAP.get(file_ext)
        else:
            return '24/' + FILEEXT_ICON_MAP.get(file_ext)
    else:
        if size == 192:
            return '192/' + FILEEXT_ICON_MAP.get('default')
        else:
            return '24/' + FILEEXT_ICON_MAP.get('default')

# This way of translation looks silly, but works well.
COMMIT_MSG_TRANSLATION_MAP = {
    'Added': _('Added'),
    'Deleted': _('Deleted'),
    'Removed': _('Removed'),
    'Modified': _('Modified'),
    'Renamed': _('Renamed'),
    'Moved': _('Moved'),
    'Added directory': _('Added directory'),
    'Removed directory': _('Removed directory'),
    'Renamed directory': _('Renamed directory'),
    'Moved directory': _('Moved directory'),
    'Added or modified': _('Added or modified'),
}
@register.filter(name='translate_commit_desc')
def translate_commit_desc(value):
    """Translate commit description."""
    if value.startswith('Reverted repo'):
        # Change 'repo' to 'library' in revert commit msg, since 'repo' is
        # only used inside of seafile system.
        value = value.replace('repo', 'library')

    # Do nothing if current language is English.
    if translation.get_language() == 'en':
        return value

    if value.startswith('Reverted library'):
        return value.replace('Reverted library to status at', _('Reverted library to status at'))
    elif value.startswith('Reverted file'):
        def repl(matchobj):
            return _('Reverted file "%(file)s" to status at %(time)s.') % \
                {'file':matchobj.group(1), 'time':matchobj.group(2)}
        return re.sub('Reverted file "(.*)" to status at (.*)', repl, value)
    elif value.startswith('Recovered deleted directory'):
        return value.replace('Recovered deleted directory', _('Recovered deleted directory'))
    elif value.startswith('Changed library'):
        return value.replace('Changed library name or description', _('Changed library name or description'))
    elif value.startswith('Merged') or value.startswith('Auto merge'):
        return _('Auto merge by seafile system')
    elif value.startswith('Created library'):
        return _('Created library')
    else:
        # Use regular expression to translate commit description.
        # Commit description has two forms, e.g., 'Added "foo.txt" and 3 more files.' or 'Added "foo.txt".'
        operations = '|'.join(list(COMMIT_MSG_TRANSLATION_MAP.keys()))
        patt = r'(%s) "(.*)"\s?(and ([0-9]+) more (files|directories))?' % operations

        ret_list = []
        for e in value.split('\n'):
            if not e:
                continue

            m = re.match(patt, e)
            if not m:
                ret_list.append(e)
                continue

            op = m.group(1)     # e.g., "Added"
            op_trans = _(op)
            file_name = m.group(2) # e.g., "foo.txt"
            has_more = m.group(3)  # e.g., "and 3 more files"
            n_files = m.group(4)   # e.g., "3"
            more_type = m.group(5) # e.g., "files"

            if has_more:
                if translation.get_language() == 'zh-cn':
                    typ = '文件' if more_type == 'files' else '目录'
                    ret = op_trans + ' "' + file_name + '"以及另外' + n_files + '个' + typ + '.'
                # elif translation.get_language() == 'ru':
                #     ret = ...
                else:
                    ret = e
            else:
                ret = op_trans + ' "' + file_name + '".'
            ret_list.append(ret)

        return '\n'.join(ret_list)

@register.filter(name='translate_commit_desc_escape')
def translate_commit_desc_escape(value):
    """Translate commit description."""
    if value.startswith('Reverted repo'):
        # Change 'repo' to 'library' in revert commit msg, since 'repo' is
        # only used inside of seafile system.
        value = value.replace('repo', 'library')

    ret_list = []

    # Do nothing if current language is English.
    if translation.get_language() == 'en':
        for e in value.split('\n'):
            # if not match, this commit desc will not convert link, so
            # escape it
            ret = e if re.search(CMMT_DESC_PATT, e) else escape(e)
            ret_list.append(ret)
        return '\n'.join(ret_list)

    if value.startswith('Reverted library'):
        return_value = escape(value.replace('Reverted library to status at', _('Reverted library to status at')))
    elif value.startswith('Reverted file'):
        def repl(matchobj):
            return _('Reverted file "%(file)s" to status at %(time)s.') % \
                {'file':matchobj.group(1), 'time':matchobj.group(2)}
        return_value = escape(re.sub('Reverted file "(.*)" to status at (.*)', repl, value))
    elif value.startswith('Recovered deleted directory'):
        return_value = escape(value.replace('Recovered deleted directory', _('Recovered deleted directory')))
    elif value.startswith('Changed library'):
        return_value = escape(value.replace('Changed library name or description', _('Changed library name or description')))
    elif value.startswith('Merged') or value.startswith('Auto merge'):
        return_value = escape(_('Auto merge by seafile system'))
    elif value.startswith('Created library'):
        return_value = escape(_('Created library'))
    else:
        # Use regular expression to translate commit description.
        # Commit description has two forms, e.g., 'Added "foo.txt" and 3 more files.' or 'Added "foo.txt".'
        operations = '|'.join(list(COMMIT_MSG_TRANSLATION_MAP.keys()))
        patt = r'(%s) "(.*)"\s?(and ([0-9]+) more (files|directories))?' % operations

        for e in value.split('\n'):
            if not e:
                continue

            m = re.match(patt, e)
            if not m:
                # if not match, this commit desc will not convert link, so
                # escape it
                ret_list.append(escape(e))
                continue

            op = m.group(1)     # e.g., "Added"
            op_trans = _(op)
            file_name = m.group(2) # e.g., "foo.txt"
            has_more = m.group(3)  # e.g., "and 3 more files"
            n_files = m.group(4)   # e.g., "3"
            more_type = m.group(5) # e.g., "files"

            if has_more:
                if translation.get_language() == 'zh-cn':
                    typ = '文件' if more_type == 'files' else '目录'
                    ret = op_trans + ' "' + file_name + '"以及另外' + n_files + '个' + typ + '.'
                # elif translation.get_language() == 'ru':
                #     ret = ...
                else:
                    ret = e
            else:
                ret = op_trans + ' "' + file_name + '".'

            # if not match, this commit desc will not convert link, so
            # escape it
            ret = ret if re.search(CMMT_DESC_PATT, e) else escape(ret)
            ret_list.append(ret)

        return_value = '\n'.join(ret_list)

    return return_value

@register.filter(name='translate_seahub_time')
def translate_seahub_time(value, autoescape=None):
    if isinstance(value, int) or isinstance(value, int): # check whether value is int
        try:
            val = datetime.fromtimestamp(value) # convert timestamp to datetime
        except ValueError as e:
            return ""
    elif isinstance(value, datetime):
        val = value
    else:
        return value

    translated_time = translate_seahub_time_str(val)
    if autoescape:
        translated_time = escape(translated_time)

    timestring = val.isoformat()
    if val.tzinfo is None:
        tzinfo = pytz.timezone(TIME_ZONE)
        val = tzinfo.localize(val)
    titletime = DateFormat(val).format('r')

    time_with_tag = '<time datetime="'+timestring+'" is="relative-time" title="'+titletime+'" >'+translated_time+'</time>'

    return mark_safe(time_with_tag)


@register.filter(name='translate_seahub_time_str')
def translate_seahub_time_str(val):
    """Convert python datetime to human friendly format."""

    now = datetime.now()
    # If current time is less than `val`, that means clock at user machine is
    # faster than server, in this case, we just set time description to `just now`
    if now < val:
        return _('Just now')

    limit = 14 * 24 * 60 * 60  # Timestamp with in two weeks will be translated

    delta = now - (val - dt.timedelta(0, 0, val.microsecond))
    seconds = delta.seconds
    days = delta.days
    if days * 24 * 60 * 60 + seconds > limit:
        return val.strftime("%Y-%m-%d")
    elif days > 0:
        ret = ngettext(
            '%(days)d day ago',
            '%(days)d days ago',
            days ) % { 'days': days }
        return ret
    elif seconds > 60 * 60:
        hours = seconds / 3600
        ret = ngettext(
            '%(hours)d hour ago',
            '%(hours)d hours ago',
            hours ) % { 'hours': hours }
        return ret
    elif seconds > 60:
        minutes = seconds/60
        ret = ngettext(
            '%(minutes)d minute ago',
            '%(minutes)d minutes ago',
            minutes ) % { 'minutes': minutes }
        return ret
    elif seconds > 0:
        ret = ngettext(
            '%(seconds)d second ago',
            '%(seconds)d seconds ago',
            seconds ) % { 'seconds': seconds }
        return ret
    else:
        return _('Just now')

@register.filter(name='email2nickname')
def email2nickname(value):
    """
    Return nickname if it exists and it's not an empty string,
    otherwise return short email.
    """
    if not value:
        return ''

    key = normalize_cache_key(value, NICKNAME_CACHE_PREFIX)
    cached_nickname = cache.get(key)
    if cached_nickname and cached_nickname.strip():
        return cached_nickname.strip()

    profile = get_first_object_or_none(Profile.objects.filter(user=value))
    if profile is not None and profile.nickname and profile.nickname.strip():
        nickname = profile.nickname.strip()
    else:
        contact_email = email2contact_email(value)
        nickname = contact_email.split('@')[0]

    cache.set(key, nickname, NICKNAME_CACHE_TIMEOUT)
    return nickname

@register.filter(name='email2contact_email')
def email2contact_email(value):
    """
    Return contact_email if it exists and it's not an empty string,
    otherwise return username(login email).
    """
    if not value:
        return ''

    key = normalize_cache_key(value, CONTACT_CACHE_PREFIX)
    contact_email = cache.get(key)
    if contact_email and contact_email.strip():
        return contact_email

    contact_email = Profile.objects.get_contact_email_by_user(value)
    cache.set(key, contact_email, CONTACT_CACHE_TIMEOUT) 
    return contact_email

@register.filter(name='email2login_id')
def email2login_id(value):
    """
    Return contact_email if it exists and it's not an empty string,
    otherwise return username(login email).
    """
    if not value:
        return ''

    key = normalize_cache_key(value, LOGIN_ID_CACHE_PREFIX)
    login_id = cache.get(key)
    if login_id and login_id.strip():
        return login_id
    
    profile = Profile.objects.get_profile_by_user(value)
    login_id = profile and profile.login_id or ''
    cache.set(key, login_id, LOGIN_ID_CACHE_TIMEOUT)
    return login_id


@register.filter(name='email2id')
def email2id(value):
    """
    Return the user id of an email. User id can be 0(ldap user),
    positive(registered user) or negtive(unregistered user).

    """
    if not value:
        return -1

    key = normalize_cache_key(value, EMAIL_ID_CACHE_PREFIX)
    user_id = cache.get(key)
    if user_id is None:
        try:
            user = User.objects.get(email=value)
            user_id = user.id
        except User.DoesNotExist:
            user_id = -1
        cache.set(key, user_id, EMAIL_ID_CACHE_TIMEOUT)
    return user_id

@register.filter(name='id_or_email')
def id_or_email(value):
    """A wrapper to ``email2id``. Returns origin email if user id is 0(ldap user).
    """
    uid = email2id(value)
    return value if uid == 0 else uid

@register.filter(name='url_target_blank')
def url_target_blank(text):
    return text.replace('<a ', '<a target="_blank" ')
url_target_blank.is_safe=True

at_pattern = re.compile(r'(@\w+)', flags=re.U)

@register.filter(name='find_at')
def find_at(text):
    return at_pattern.sub(r'<span class="at">\1</span>', text)
find_at.is_safe=True

@register.filter(name='short_email')
def short_email(email):
    """
    Return short email which is the string before '@'.
    """
    idx = email.find('@')
    if idx <= 0:
        return email
    else:
        return email[:idx]

@register.filter(name='seahub_urlize')
def seahub_urlize(value, autoescape=None):
    """Converts URLs in plain text into clickable links."""
    from seahub.base.utils import urlize
    return mark_safe(urlize(value, nofollow=True, autoescape=autoescape))
seahub_urlize.is_safe=True
seahub_urlize.needs_autoescape = True

cc = CConvert()
cc.spliter = ''
@register.filter(name='char2pinyin')
def char2pinyin(value):
    """Convert Chinese character to pinyin."""

    key = normalize_cache_key(value, 'CHAR2PINYIN_')
    py = cache.get(key)
    if not py:
        py = cc.convert(value)
        cache.set(key, py, 365 * 24 * 60 * 60)

    return py

@register.filter(name='translate_permission')
def translate_permission(value):
    if value == 'rw':
        return _('Read-Write')
    elif value == 'r':
        return _('Read-Only')
    else:
        return ''

@register.filter(name='trim')
def trim(value, length):
    if len(value) > length:
        return value[:length-2] + '...'
    else:
        return value

@register.filter(name='strip_slash')
def strip_slash(value):
    return value.strip('/')

@register.filter(is_safe=True)
def seahub_filesizeformat(bytes):
    """
    Formats the value like a 'human-readable' file size (i.e. 13 KB, 4.1 MB,
    102 bytes, etc).
    """
    try:
        bytes = float(bytes)
    except (TypeError, ValueError, UnicodeDecodeError):
        value = ngettext("%(size)d byte", "%(size)d bytes", 0) % {'size': 0}
        return avoid_wrapping(value)

    filesize_number_format = lambda value: formats.number_format(round(value, 1), 1)

    KB = get_file_size_unit('KB')
    MB = get_file_size_unit('MB')
    GB = get_file_size_unit('GB')
    TB = get_file_size_unit('TB')
    PB = get_file_size_unit('PB')

    if bytes < KB:
        value = ngettext("%(size)d byte", "%(size)d bytes", bytes) % {'size': bytes}
    elif bytes < MB:
        value = gettext("%s KB") % filesize_number_format(bytes / KB)
    elif bytes < GB:
        value = gettext("%s MB") % filesize_number_format(bytes / MB)
    elif bytes < TB:
        value = gettext("%s GB") % filesize_number_format(bytes / GB)
    elif bytes < PB:
        value = gettext("%s TB") % filesize_number_format(bytes / TB)
    else:
        value = gettext("%s PB") % filesize_number_format(bytes / PB)

    return avoid_wrapping(value)

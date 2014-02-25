# encoding: utf-8
import datetime as dt
from datetime import datetime
import re
import time

from django import template
from django.core.cache import cache
from django.utils.safestring import mark_safe
from django.utils import translation
from django.utils.translation import ugettext as _
from django.utils.translation import ungettext
from django.utils.translation import pgettext

from seahub.base.accounts import User
from seahub.profile.models import Profile
from seahub.profile.settings import NICKNAME_CACHE_TIMEOUT, NICKNAME_CACHE_PREFIX, \
    EMAIL_ID_CACHE_TIMEOUT, EMAIL_ID_CACHE_PREFIX
from seahub.cconvert import CConvert
from seahub.po import TRANSLATION_MAP
from seahub.shortcuts import get_first_object_or_none
from seahub.utils import normalize_cache_key

register = template.Library()

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
    # pdf file
    'pdf' : 'pdf.png',
    # document file
    'doc' : 'word.png',
    'docx' : 'word.png',
    'ppt' : 'ppt.png',
    'pptx' : 'ppt.png',
    'xls' : 'excel.png',
    'xlsx' : 'excel.png',
    'txt' : 'txt.png',
    'odt' : 'word.png',
    'fodt' : 'word.png',
    'ods' : 'excel.png',
    'fods' : 'excel.png',
    'odp' : 'ppt.png',
    'fodp' : 'ppt.png',
    # music file
    'mp3' : 'music.png',
    # picture file
    'jpg' : 'pic.png',
    'jpeg' : 'pic.png',
    'png' : 'pic.png',
    'svg' : 'pic.png',
    'gif' : 'pic.png',
    'bmp' : 'pic.png',
    # normal file and unkown file
    'default' : 'file.png',
}
@register.filter(name='file_icon_filter')
def file_icon_filter(value):
    """Get file icon according to the file postfix"""
    if value.rfind('.') > 0:
        file_ext = value.split('.')[-1].lower()
    else:
        file_ext = None

    if file_ext and FILEEXT_ICON_MAP.has_key(file_ext):
        return FILEEXT_ICON_MAP.get(file_ext)
    else:
        return FILEEXT_ICON_MAP.get('default')

# This way of translation looks silly, but works well.
COMMIT_MSG_TRANSLATION_MAP = {  
    'Added' : _('Added'),
    'Deleted' : _('Deleted'),
    'Removed' : _('Removed'),
    'Modified' : _('Modified'),
    'Renamed' : _('Renamed'),
    'Moved' : _('Moved'),
    'Added directory' : _('Added directory'),
    'Removed directory' : _('Removed directory'),
    'Renamed directory' : _('Renamed directory'),
    'Moved directory' : _('Moved directory'),
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
    else:
        # Use regular expression to translate commit description.
        # Commit description has two forms, e.g., 'Added "foo.txt" and 3 more files.' or 'Added "foo.txt".'
        operations = '|'.join(COMMIT_MSG_TRANSLATION_MAP.keys())
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
                    typ = u'文件' if more_type == 'files' else u'目录'
                    ret = op_trans + u' "' + file_name + u'"以及另外' + n_files + u'个' + typ + '.'
                # elif translation.get_language() == 'ru':
                #     ret = ...
                else:
                    ret = e
            else:
                ret = op_trans + u' "' + file_name + u'".'
            ret_list.append(ret)

        return '\n'.join(ret_list)

@register.filter(name='translate_seahub_time')
def translate_seahub_time(value):
    """Translate seahub time to human friendly format instead of timestamp"""
    
    if isinstance(value, int) or isinstance(value, long): # check whether value is int
        val_ts = value
        val = datetime.fromtimestamp(val_ts) # convert timestamp to datetime
    elif isinstance(value, datetime):
        # FIXME: convert datetime to timestamp may cause problem, need a better way.
        val_ts = int(time.mktime(value.timetuple())) 
        val = value
    else:
        return value

    limit = 14 * 24 * 60 * 60	# Timestamp with in two weeks will be translated
    now = datetime.now()
    # If current time is less than value, that means clock at user machine is
    # faster than server, in this case, we just set time description to `just now`
    if time.mktime(now.timetuple()) < val_ts:
        return _('Just now')

    delta = now - (val - dt.timedelta(0, 0, val.microsecond))
    seconds = delta.seconds
    days = delta.days
    if days * 24 * 60 * 60 + seconds > limit:
        return val.strftime("%Y-%m-%d")
    elif days > 0:
        ret = ungettext(
            '%(days)d day ago',
            '%(days)d days ago',
            days ) % { 'days': days }
        return ret
    elif seconds > 60 * 60:
        hours = seconds / 3600
        ret = ungettext(
            '%(hours)d hour ago',
            '%(hours)d hours ago',
            hours ) % { 'hours': hours }
        return ret
    elif seconds > 60:
        minutes = seconds/60
        ret = ungettext(
            '%(minutes)d minute ago',
            '%(minutes)d minutes ago',
            minutes ) % { 'minutes': minutes }
        return ret
    elif seconds > 0:
        ret = ungettext(
            '%(seconds)d second ago',
            '%(seconds)d seconds ago',
            seconds ) % { 'seconds': seconds }
        return ret
    else:
        return _('Just now')
    
@register.filter(name='email2nickname')
def email2nickname(value):
    """
    Return nickname or short email.
    """
    if not value:
        return ''

    key = normalize_cache_key(value, NICKNAME_CACHE_PREFIX)
    nickname = cache.get(key)
    if not nickname:
        profile = get_first_object_or_none(Profile.objects.filter(user=value))
        if profile is not None and profile.nickname:
            nickname = profile.nickname
        else:
            nickname = value.split('@')[0]
        cache.set(key, nickname, NICKNAME_CACHE_TIMEOUT)
    return nickname

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
    if not user_id:
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
        return _(u'Read-Write')
    elif value == 'r':
        return _(u'Read-Only')
    else:
        return ''

@register.filter(name='trim')
def trim(value, length):
    if len(value) > length:
        return value[:length-2] + '...'
    else:
        return value

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

from profile.models import Profile
from profile.settings import NICKNAME_CACHE_TIMEOUT, NICKNAME_CACHE_PREFIX, \
    EMAIL_ID_CACHE_TIMEOUT, EMAIL_ID_CACHE_PREFIX
from seahub.cconvert import CConvert
from seahub.po import TRANSLATION_MAP
from seahub.shortcuts import get_first_object_or_none
from base.accounts import User


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
        val_ts = int(value.strftime("%s"))
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
    
    nickname = cache.get(NICKNAME_CACHE_PREFIX+value)
    if not nickname:
        profile = get_first_object_or_none(Profile.objects.filter(user=value))
        nickname = profile.nickname if profile else value.split('@')[0]
        cache.set(NICKNAME_CACHE_PREFIX+value, nickname, NICKNAME_CACHE_TIMEOUT)
    return nickname

@register.filter(name='email2id')
def email2id(value):
    """
    Return the user id of an email or -1.
    """
    if not value:
        return -1
    
    user_id = cache.get(EMAIL_ID_CACHE_PREFIX+value)
    if not user_id:
        try:
            user = User.objects.get(email=value)
            user_id = user.id
        except User.DoesNotExist:
            user_id = -1
        cache.set(EMAIL_ID_CACHE_PREFIX+value, user_id, EMAIL_ID_CACHE_TIMEOUT)
    return user_id

    
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

    py = cache.get('CHAR2PINYIN_'+value)
    if not py:
        py = cc.convert(value)
        cache.set('CHAR2PINYIN_'+value, py, 365 * 24 * 60 * 60)

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

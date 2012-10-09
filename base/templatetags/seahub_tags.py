# encoding: utf-8
import datetime as dt
import re
from datetime import datetime

from django import template
from django.core.cache import cache
from django.utils.safestring import mark_safe

from profile.models import Profile
from profile.settings import NICKNAME_CACHE_TIMEOUT, NICKNAME_CACHE_PREFIX
from seahub.cconvert import CConvert
from seahub.settings import FILEEXT_ICON_MAP
from seahub.po import TRANSLATION_MAP
from seahub.shortcuts import get_first_object_or_none


register = template.Library()

@register.filter(name='tsstr_sec')
def tsstr_sec(value):
    """Turn a timestamp to string"""
    try:
        return datetime.fromtimestamp(value).strftime("%Y-%m-%d %H:%M:%S")
    except:
        return datetime.fromtimestamp(value/1000000).strftime("%Y-%m-%d %H:%M:%S")

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

@register.filter(name='translate_commit_desc')
def translate_commit_desc(value):
    """Translate commit description."""
    if value.startswith('Reverted repo'):
        return value.replace('Reverted repo to status at', u'资料库内容还原到')
    elif value.startswith('Reverted file'):
        value = value.replace('Reverted file', u'还原文件')
        value = value.replace('to status at', u'内容到')
        return value
    elif value.startswith('Merged'):
        return u'合并了其他人的修改'
    else:
        operations = '|'.join(TRANSLATION_MAP.keys())
        patt = r'(%s) "(.*)"\s?(and ([0-9]+) more (files|directories))?' % operations

        ret_list = []
        for e in value.split('\n'):
            if not e:
                continue

            m = re.match(patt, e)
            if not m:
                ret_list.append(e)
                continue
        
            op = m.group(1)
            op_trans = TRANSLATION_MAP.get(op)
            file_name = m.group(2)
            more = m.group(3)
            n_files = m.group(4)
            more_type = m.group(5)
    
            if not more:
                ret = op_trans + u' "' + file_name + u'".'
            else:
                if more_type == 'files':
                    typ = u'文件'
                else:
                    typ = u'目录'
                ret = op_trans + u' "' + file_name + u'"以及另外' + n_files + u'个' + typ + '.'
            ret_list.append(ret)

        return '\n'.join(ret_list)
    
@register.filter(name='translate_commit_time')
def translate_commit_time(value):
    """Translate commit time to human frindly format instead of timestamp"""
    
    if isinstance(value, int) or isinstance(value, long): # check whether value is int
        val = datetime.fromtimestamp(value)
    elif isinstance(value, datetime):
        val = datetime.fromtimestamp(int(value.strftime("%s")))
    else:
        return value

    limit = 14 * 24 * 60 * 60	# Timestamp with in two weeks will be translated
    now = datetime.now()
    delta = now - (val - dt.timedelta(0, 0, val.microsecond))

    seconds = delta.seconds
    days = delta.days
    if days * 24 * 60 * 60 + seconds > limit:
        return val.strftime("%Y-%m-%d")
    elif days > 0:
        return u'%d 天前' % (days)
    elif seconds > 60 * 60:
        return u'%d 小时前' % (seconds/3600)
    elif seconds > 60:
        return u'%d 分钟前' % (seconds/60)
    else:
        return u'%d 秒前' % (seconds)

@register.filter(name='translate_remain_time')
def translate_remain_time(value):
    if value > 24 * 60 * 60:
        return u'%d 天' % (value/24/3600)
    elif value > 60 * 60:
        return u'%d 小时' % (value/3600)
    elif value > 60:
        return u'%d 分钟' % (value/60)
    else:
        return u'%d 秒' % (value)

@register.filter(name='email2nickname')
def email2nickname(value):
    if not value:
        return ''
    
    nickname = cache.get(NICKNAME_CACHE_PREFIX+value)
    if not nickname:
        profile = get_first_object_or_none(Profile.objects.filter(user=value))
        nickname = profile.nickname if profile else value.split('@')[0]
        cache.set(NICKNAME_CACHE_PREFIX+value, nickname, NICKNAME_CACHE_TIMEOUT)
    return nickname
    
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
    return cc.convert(value)

@register.filter(name='translate_permission')
def translate_permission(value):
    if value == 'rw':
        return u'可读写'
    elif value == 'r':
        return u'只可浏览'
    else:
        return ''

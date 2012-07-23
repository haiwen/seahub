# encoding: utf-8
import datetime as dt
import re
from datetime import datetime

from django import template

from seahub.settings import FILEEXT_ICON_MAP
from seahub.po import TRANSLATION_MAP
from seahub.profile.models import Profile

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
        return value.replace('Reverted repo to status at', u'同步目录内容还原到')
    elif value.startswith('Reverted file'):
        value = value.replace('Reverted file', u'还原文件')
        value = value.replace('to status at', u'内容到')
        return value
    elif value.startswith('Merged'):
        return u'合并了其他人的修改'
    else:
        operations = '|'.join(TRANSLATION_MAP.keys())
        patt = r'(%s) "(.*)"\s?(and ([0-9]+) more files)?' % operations

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
            more_files = m.group(3)
            n_files = m.group(4)
    
            if not more_files:
                ret = op_trans + u' "' + file_name + u'".'
            else:
                ret = op_trans + u' "' + file_name + u'"以及另外' + n_files + u'个文件.'
            ret_list.append(ret)

        return '\n'.join(ret_list)
    
@register.filter(name='translate_commit_time')
def translate_commit_time(value):
    """Translate commit time to human frindly format instead of timestamp"""
    
    if type(value) == type(1):	# check whether value is int
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
    try:
        profile = Profile.objects.get(user=value)
        return profile.nickname
    except Profile.DoesNotExist:
        return value.split('@')[0]

@register.filter(name='url_target_blank')
def url_target_blank(text):
    return text.replace('<a ', '<a target="_blank" ')
url_target_blank.is_safe=True

@register.filter(name='short_email')
def short_email(email):
    """
    Return short email which is the string before '@'.
    """
    if email.find('@') <= 0:
        return email
    else:
        return email[:email.find('@')]

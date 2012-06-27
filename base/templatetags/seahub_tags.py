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

def desc_repl(matchobj):
    if TRANSLATION_MAP.has_key(matchobj.group(0)):
        return TRANSLATION_MAP.get(matchobj.group(0))

@register.filter(name='translate_commit_desc')
def translate_commit_desc(value):
    reg = '|'.join(TRANSLATION_MAP.keys())

    return re.sub(reg, desc_repl, value)

@register.filter(name='translate_commit_time')
def translate_commit_time(value):
    """Translate commit time to human frindly format instead of timestamp"""
    limit = 14 * 24 * 60 * 60	# Timestamp with in two weeks will be translated
    if hasattr(value, 'strftime'):
        val = datetime.fromtimestamp(int(value.strftime("%s")))
    else:
        val = datetime.fromtimestamp(value)

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

from datetime import datetime
from django import template

from seahub.settings import FILEEXT_ICON_MAP

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
        file_ext = value.split('.')[-1]
    else:
        file_ext = None

    if file_ext and FILEEXT_ICON_MAP.has_key(file_ext):
        return FILEEXT_ICON_MAP.get(file_ext)
    else:
        return FILEEXT_ICON_MAP.get('default')

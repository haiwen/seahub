from datetime import datetime
from django import template

from seahub.settings import SUPPORTED_FILE_EXT

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

    if file_ext and SUPPORTED_FILE_EXT.has_key(file_ext):
        return SUPPORTED_FILE_EXT.get(file_ext)
    else:
        return SUPPORTED_FILE_EXT.get('default')

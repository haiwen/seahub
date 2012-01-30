from datetime import datetime
from django import template

register = template.Library()

@register.filter(name='tsstr_sec')
def tsstr_sec(value):
    """Turn a timestamp to string"""
    return datetime.fromtimestamp(value).strftime("%Y-%m-%d %H:%M:%S")

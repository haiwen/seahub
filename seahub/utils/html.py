# Copyright (c) 2012-2016 Seafile Ltd.
from __future__ import unicode_literals

def avoid_wrapping(value):
    """
    Avoid text wrapping in the middle of a phrase by adding non-breaking
    spaces where there previously were normal spaces.
    """
    return value.replace(" ", "\xa0")

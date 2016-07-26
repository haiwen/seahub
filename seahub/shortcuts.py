# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

def get_first_object_or_none(queryset):
    """
    A shortcut to obtain the first object of a queryset if it exists or None
    otherwise.
    """
    try:
        return queryset[:1][0]
    except IndexError:
        return None

# Copyright (c) 2012-2016 Seafile Ltd.
from django.utils import timezone
from django.views.decorators.http import last_modified
from django.views.i18n import javascript_catalog
from django.views.decorators.cache import cache_page

# == Server side cache ==,
# The value returned by get_version() must change when translations change.
# @cache_page(86400, key_prefix='js18n')

# == Clien side cache ==
# last_modified_date = timezone.now()
# @last_modified(lambda req, **kw: last_modified_date)

def cached_javascript_catalog(request, domain='djangojs', packages=None):
    return javascript_catalog(request, domain, packages)

# Copyright (c) 2012-2016 Seafile Ltd.
#
# rooturl.py -- URL patterns for rooted sites.
#
# Copyright (c) 2007-2009  Christian Hammond
#
# Permission is hereby granted, free of charge, to any person obtaining
# a copy of this software and associated documentation files (the
# "Software"), to deal in the Software without restriction, including
# without limitation the rights to use, copy, modify, merge, publish,
# distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so, subject to
# the following conditions:
#
# The above copyright notice and this permission notice shall be included
# in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
# IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
# CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
# TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
# SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
#


from django.conf import settings
from django.urls import include, re_path
from django.core.exceptions import ImproperlyConfigured


# Ensures that we can run nose on this without needing to set SITE_ROOT.
# Also serves to let people know if they set one variable without the other.
if hasattr(settings, "SITE_ROOT"):
    if not hasattr(settings, "SITE_ROOT_URLCONF"):
        raise ImproperlyConfigured("SITE_ROOT_URLCONF must be set when "
                                   "using SITE_ROOT")

    urlpatterns = [
        re_path(r'^%s' % settings.SITE_ROOT[1:], include(settings.SITE_ROOT_URLCONF)),
    ]

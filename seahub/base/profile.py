# Copyright (c) 2012-2016 Seafile Ltd.
"""
The MIT License (MIT)

Copyright (c) 2013 Omar Bohsali

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
"""

try:
    import cProfile as profile
except ImportError:
    from . import profile

import pstats
from io import StringIO
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin

class ProfilerMiddleware(MiddlewareMixin):
    """
    Simple profile middleware to profile django views. To run it, add ?prof to
    the URL like this:

        http://localhost:8000/view/?__prof__=true

    Optionally pass the following to modify the output:

    ?sort => Sort the output by a given metric. Default is time.
        See http://docs.python.org/2/library/profile.html#pstats.Stats.sort_stats
        for all sort options.

        quick reference:
        - time: sort by function execution time
        - cum: the cumulative time spent in this and all subfunctions (from invocation till exit). This figure is accurate even for recursive functions.

    ?count => The number of rows to display. Default is 100.

    ?fullpath=<true|false> default false. True to show full path of the source file of each function

    ?callee=<true|false> default false. True to show the time of a function spent on its sub function.

    This is adapted from an example found here:
    http://www.slideshare.net/zeeg/django-con-high-performance-django-presentation.
    """
    def can(self, request):
        return settings.DEBUG and request.GET.get('__prof__', False) == 'true'

    def process_view(self, request, callback, callback_args, callback_kwargs):
        if self.can(request):
            self.profiler = profile.Profile()
            args = (request,) + callback_args
            return self.profiler.runcall(callback, *args, **callback_kwargs)

    def process_response(self, request, response):
        if self.can(request):
            self.profiler.create_stats()
            io = StringIO()
            stats = pstats.Stats(self.profiler, stream=io)
            if not request.GET.get('fullpath', False):
                stats.strip_dirs()

            stats.sort_stats(request.GET.get('sort', 'time'))

            if request.GET.get('callee', False):
                stats.print_callees()

            stats.print_stats(int(request.GET.get('count', 100)))
            response.content = '<pre>%s</pre>' % io.getvalue()
        return response

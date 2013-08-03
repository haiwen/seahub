"""Adapted from https://github.com/omarish/django-cprofile-middleware/"""

try:
    import cProfile as profile
except ImportError:
    import profile

import pstats
from cStringIO import StringIO
from django.conf import settings

class ProfilerMiddleware(object):
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
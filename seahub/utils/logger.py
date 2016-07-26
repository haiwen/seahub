# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import time
import fpformat

log = logging.getLogger(__name__)

def logger(func):
    def _decorated(request, *args, **kwargs):
        start = time.time()
        result = func(request, *args, **kwargs)
        log.info('%s takes %s secs. ' % (func.__name__, fpformat.fix(time.time()-start, 10)))
        return result
    return _decorated


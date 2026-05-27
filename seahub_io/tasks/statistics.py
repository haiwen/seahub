# coding: utf-8
import logging
from threading import Thread, Event

from seahub_io.statistics import TrafficInfoCounter, UserActivityCounter


def exception_catch(module):
    def func_wrapper(func):
        def wrapper(*args, **kwargs):
            try:
                func(*args, **kwargs)
            except Exception as e:
                logging.info('[Statistics] %s task is failed: %s' % (module, e))
        return wrapper
    return func_wrapper


class CountTrafficInfo(Thread):
    # This should run at frontend node server.
    def __init__(self, config):
        Thread.__init__(self)
        self.config = config
        self.finished = Event()

    @exception_catch('CountTrafficInfo')
    def run(self):
        enabled = False
        if self.config.has_option('STATISTICS', 'enabled'):
            enabled = self.config.getboolean('STATISTICS', 'enabled')
        if not enabled:
            logging.info("Traffic statistics is disabled.")
            return

        while not self.finished.is_set():
            TrafficInfoCounter().start_count()
            self.finished.wait(3600)

    def cancel(self):
        self.finished.set()

class CountUserActivity(Thread):
    # This should run at frontend node server.
    def __init__(self, config):
        Thread.__init__(self)
        self.config = config
        self.finished = Event()

    def run(self):
        enabled = False
        if self.config.has_option('STATISTICS', 'enabled'):
            enabled = self.config.getboolean('STATISTICS', 'enabled')
        if not enabled:
            logging.info("User login statistics is disabled.")
            return

        while not self.finished.is_set():
            UserActivityCounter().start_count()
            self.finished.wait(3600)

    def cancel(self):
        self.finished.set()

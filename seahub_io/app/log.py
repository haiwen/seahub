import os
import logging
import logging.handlers
import sys

class LogConfigurator(object):
    def __init__(self, level, logfile=None):
        self._level = self._get_log_level(level)
        self._logfile = logfile

        if logfile is None:
            self._basic_config()
        else:
            self._rotating_config()

    def _rotating_config(self):
        '''Rotating log'''
        handler = logging.handlers.TimedRotatingFileHandler(self._logfile, when='W0', interval=1)
        handler.setLevel(self._level)
        formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] %(name)s:%(lineno)s %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
        handler.setFormatter(formatter)

        logging.root.setLevel(self._level)
        logging.root.addHandler(handler)

    def _basic_config(self):
        '''Log to stdout. Mainly for development.'''
        kw = {
            'format': '[seahub_io] [%(asctime)s] [%(levelname)s] %(name)s:%(lineno)s %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S',
            'level': self._level,
            'stream': sys.stdout
        }

        logging.basicConfig(**kw)

    def add_syslog_handler(self):
        handler = logging.handlers.SysLogHandler(address='/dev/log')
        handler.setLevel(self._level)
        formatter = logging.Formatter('seahub_io[%(process)d]: %(message)s')
        handler.setFormatter(formatter)
        logging.root.addHandler(handler)

    def _get_log_level(self, level):
        if level == 'debug':
            return logging.DEBUG
        elif level == 'info':
            return logging.INFO
        else:
            return logging.WARNING

    def add_face_recognition_logger(self, logfile):
        logger = logging.getLogger('face_recognition')

        seafile_log_to_stdout = os.getenv('SEAFILE_LOG_TO_STDOUT', 'false') == 'true'
        if seafile_log_to_stdout:
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter('[seahub_io] [%(asctime)s] [%(levelname)s] %(name)s:%(lineno)s %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
        else:
            handler = logging.handlers.TimedRotatingFileHandler(logfile, when='W0', interval=1)
            formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] %(name)s:%(lineno)s %(message)s', datefmt='%Y-%m-%d %H:%M:%S')

        handler.setLevel(self._level)
        handler.setFormatter(formatter)

        logger.setLevel(self._level)
        logger.addHandler(handler)
        logger.propagate = False

    def add_seasearch_logger(self, logfile):
        logger = logging.getLogger('seasearch')

        seafile_log_to_stdout = os.getenv('SEAFILE_LOG_TO_STDOUT', 'false') == 'true'
        if seafile_log_to_stdout:
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter('[seahub_io] [%(asctime)s] [%(levelname)s] %(name)s:%(lineno)s %(message)s',
                                          datefmt='%Y-%m-%d %H:%M:%S')
        else:
            handler = logging.handlers.TimedRotatingFileHandler(logfile, when='W0', interval=1)
            formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] %(name)s:%(lineno)s %(message)s',
                                          datefmt='%Y-%m-%d %H:%M:%S')

        handler.setLevel(self._level)
        handler.setFormatter(formatter)

        logger.setLevel(self._level)
        logger.addHandler(handler)
        logger.propagate = False

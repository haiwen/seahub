import os
import argparse

from seahub_io.db import create_db_tables, prepare_db_tables
from seahub_io.utils import write_pidfile
from seahub_io.app.app import App
from seahub_io.app.log import LogConfigurator
from seahub_io.app.config import get_config, is_syslog_enabled


def main():
    parser = argparse.ArgumentParser(description='seahub_io main program')
    parser.add_argument('--config-file', default=os.path.join(os.getcwd(), 'seafevents.conf'), help='config file')
    parser.add_argument('--logfile', help='log file')
    parser.add_argument('--loglevel', default='info', help='log level')
    parser.add_argument('-P', '--pidfile', help='the location of the pidfile')
    args = parser.parse_args()

    if args.logfile:
        logdir = os.path.dirname(os.path.realpath(args.logfile))
        os.environ['SEAHUB_IO_LOG_DIR'] = logdir

    if args.pidfile:
        write_pidfile(args.pidfile)

    seafile_conf_dir = os.environ.get('SEAFILE_CENTRAL_CONF_DIR') or os.environ.get('SEAFILE_CONF_DIR')
    if not seafile_conf_dir:
        raise RuntimeError('Environment variable seafile_conf_dir is not define')

    config_file = os.path.expanduser(args.config_file)
    os.environ['EVENTS_CONFIG_FILE'] = config_file
    os.environ['DJANGO_SETTINGS_MODULE'] = 'seahub.settings'

    config = get_config(config_file)
    create_db_tables()
    prepare_db_tables()

    logfile = args.logfile
    if os.getenv('SEAFILE_LOG_TO_STDOUT', 'false') == 'true':
        logfile = None

    app_logger = LogConfigurator(args.loglevel, logfile)
    if is_syslog_enabled(config):
        app_logger.add_syslog_handler()

    seasearch_log_path = os.path.join(os.environ.get('SEAHUB_IO_LOG_DIR', ''), 'seasearch_index.log')
    app_logger.add_seasearch_logger(seasearch_log_path)

    app = App(config)
    app.serve_forever()


if __name__ == '__main__':
    main()

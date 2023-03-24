#!/usr/bin/env python3

'''
Setup/Start/Stop the extra components of Seafile Professional

The diretory layout:
- haiwen
  - seafile-server-1.8.0
    - seafile.sh
    - seahub.sh
    - seafile/
    - seahub/
    - pro
      - pro.py
      - python
        - sqlalchemy/
        - pyes/
        - thrift/
        - libevent
        - python-daemon/
        - lockfile/
        - seafes/
        - seafevents/
        - seaf-dav/
      - elasticsearch/
      - misc

  - seafile-license.txt
  - seahub.db
  - seahub_settings.py
  - ccnet/
  - seafile-data/
  - seahub-data/
  - pro-data
    - search/
      - data/
      - logs/
    - seafevents.conf
    - seafdav.conf
    - seafevents.db
    - index.log
    - seafevents.log
'''

import os
import sys
import glob
import subprocess
import io
import getpass

try:
    import pymysql
except:
    pass

import configparser

########################
## Helper functions
########################

class InvalidAnswer(Exception):
    def __init__(self, msg):
        Exception.__init__(self)
        self.msg = msg
    def __str__(self):
        return self.msg

class Utils(object):
    '''Groups all helper functions here'''
    @staticmethod
    def highlight(content):
        '''Add ANSI color to content to get it highlighted on terminal'''
        return '\x1b[33m%s\x1b[m' % content

    @staticmethod
    def info(msg, newline=True):
        sys.stdout.write(msg)
        if newline:
            sys.stdout.write('\n')

    @staticmethod
    def error(msg):
        '''Print error and exit'''
        print()
        print('Error: ' + msg)
        sys.exit(1)

    @staticmethod
    def run_argv(argv, cwd=None, env=None, suppress_stdout=False, suppress_stderr=False):
        '''Run a program and wait it to finish, and return its exit code. The
        standard output of this program is supressed.

        '''
        with open(os.devnull, 'w') as devnull:
            if suppress_stdout:
                stdout = devnull
            else:
                stdout = sys.stdout

            if suppress_stderr:
                stderr = devnull
            else:
                stderr = sys.stderr

            proc = subprocess.Popen(argv,
                                    cwd=cwd,
                                    stdout=stdout,
                                    stderr=stderr,
                                    env=env)
            return proc.wait()

    @staticmethod
    def run(cmdline, cwd=None, env=None, suppress_stdout=False, suppress_stderr=False):
        '''Like run_argv but specify a command line string instead of argv'''
        with open(os.devnull, 'w') as devnull:
            if suppress_stdout:
                stdout = devnull
            else:
                stdout = sys.stdout

            if suppress_stderr:
                stderr = devnull
            else:
                stderr = sys.stderr

            proc = subprocess.Popen(cmdline,
                                    cwd=cwd,
                                    stdout=stdout,
                                    stderr=stderr,
                                    env=env,
                                    shell=True)
            return proc.wait()

    @staticmethod
    def prepend_env_value(name, value, env=None, seperator=':'):
        '''prepend a new value to a list'''
        if env is None:
            env = os.environ

        try:
            current_value = env[name]
        except KeyError:
            current_value = ''

        new_value = value
        if current_value:
            new_value += seperator + current_value

        env[name] = new_value

    @staticmethod
    def must_mkdir(path):
        '''Create a directory, exit on failure'''
        try:
            os.mkdir(path)
        except OSError as e:
            Utils.error('failed to create directory %s:%s' % (path, e))

    @staticmethod
    def find_in_path(prog):
        if 'win32' in sys.platform:
            sep = ';'
        else:
            sep = ':'

        dirs = os.environ['PATH'].split(sep)
        for d in dirs:
            d = d.strip()
            if d == '':
                continue
            path = os.path.join(d, prog)
            if os.path.exists(path):
                return path

        return None

    @staticmethod
    def read_config(fn=None):
        '''Return a case sensitive ConfigParser by reading the file "fn"'''
        cp = configparser.ConfigParser()
        cp.optionxform = str
        if fn:
            cp.read(fn)

        return cp

    @staticmethod
    def write_config(cp, fn):
        '''Return a case sensitive ConfigParser by reading the file "fn"'''
        with open(fn, 'w') as fp:
            cp.write(fp)

    @staticmethod
    def ask_question(desc,
                     key=None,
                     note=None,
                     default=None,
                     validate=None,
                     yes_or_no=False,
                     password=False):
        '''Ask a question, return the answer.
        @desc description, e.g. "What is the port of ccnet?"

        @key a name to represent the target of the question, e.g. "port for
        ccnet server"

        @note additional information for the question, e.g. "Must be a valid
        port number"

        @default the default value of the question. If the default value is
        not None, when the user enter nothing and press [ENTER], the default
        value would be returned

        @validate a function that takes the user input as the only parameter
        and validate it. It should return a validated value, or throws an
        "InvalidAnswer" exception if the input is not valid.

        @yes_or_no If true, the user must answer "yes" or "no", and a boolean
        value would be returned

        @password If true, the user input would not be echoed to the
        console

        '''
        assert key or yes_or_no
        # Format description
        print()
        if note:
            desc += '\n' + note

        desc += '\n'
        if yes_or_no:
            desc += '[ yes or no ]'
        else:
            if default:
                desc += '[ default "%s" ]' % default
            else:
                desc += '[ %s ]' % key

        desc += ' '
        while True:
            # prompt for user input
            if password:
                answer = getpass.getpass(desc).strip()
            else:
                answer = input(desc).strip()

            # No user input: use default
            if not answer:
                if default:
                    answer = default
                else:
                    continue

            # Have user input: validate answer
            if yes_or_no:
                if answer not in ['yes', 'no']:
                    print(Utils.highlight('\nPlease answer yes or no\n'))
                    continue
                else:
                    return answer == 'yes'
            else:
                if validate:
                    try:
                        return validate(answer)
                    except InvalidAnswer as e:
                        print(Utils.highlight('\n%s\n' % e))
                        continue
                else:
                    return answer

    @staticmethod
    def validate_port(port):
        try:
            port = int(port)
        except ValueError:
            raise InvalidAnswer('%s is not a valid port' % Utils.highlight(port))

        if port <= 0 or port > 65535:
            raise InvalidAnswer('%s is not a valid port' % Utils.highlight(port))

        return port

    @staticmethod
    def get_python_executable():
        '''Find a suitable python executable'''
        try_list = [
            'python3',
        ]

        for prog in try_list:
            path = Utils.find_in_path(prog)
            if path is not None:
                return path

        path = os.environ.get('PYTHON', 'python')

        if not path:
            Utils.error('Can not find python executable')

        return path

    @staticmethod
    def pkill(process):
        '''Kill the program with the given name'''
        argv = [
            'pkill', '-f', process
        ]

        Utils.run_argv(argv)

class EnvManager(object):
    '''System environment and directory layout'''
    def __init__(self):
        self.install_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.top_dir = os.path.dirname(self.install_path)
        self.bin_dir = os.path.join(self.install_path, 'seafile', 'bin')
        self.central_config_dir = os.path.join(self.top_dir, 'conf')

        self.pro_data_dir = os.path.join(self.top_dir, 'pro-data')
        self.pro_program_dir = os.path.join(self.install_path, 'pro')
        self.pro_pylibs_dir = os.path.join(self.pro_program_dir, 'python')
        self.pro_misc_dir = os.path.join(self.pro_program_dir, 'misc')

        self.seafes_dir = os.path.join(self.pro_pylibs_dir, 'seafes')
        self.seahub_dir = os.path.join(self.install_path, 'seahub')

        self.ccnet_dir = os.path.join(self.top_dir, 'ccnet')
        self.seafile_dir = os.path.join(self.top_dir, 'seafile-data')
        self.central_config_dir = os.path.join(self.top_dir, 'conf')
        self.seafile_rpc_pipe_path = os.path.join(self.install_path, 'runtime');

    def get_seahub_env(self):
        '''Prepare for seahub syncdb'''
        env = dict(os.environ)
        env['CCNET_CONF_DIR'] = self.ccnet_dir
        env['SEAFILE_CONF_DIR'] = self.seafile_dir
        env['SEAFILE_CENTRAL_CONF_DIR'] = self.central_config_dir
        env['SEAFILE_RPC_PIPE_PATH'] = self.seafile_rpc_pipe_path
        env['SEAFES_DIR'] = self.seafes_dir
        env['SEAHUB_DIR'] = self.seahub_dir
        self.setup_python_path(env)
        return env

    def setup_python_path(self, env):
        '''And PYTHONPATH and CCNET_CONF_DIR/SEAFILE_CONF_DIR to env, which is
        needed by seahub

        '''
        extra_python_path = [
            self.pro_pylibs_dir,

            os.path.join(self.top_dir, 'conf'), # LDAP sync has to access seahub_settings.py
            os.path.join(self.install_path, 'seahub', 'thirdpart'),

            os.path.join(self.install_path, 'seafile/lib/python3/site-packages'),
            os.path.join(self.install_path, 'seafile/lib64/python3/site-packages'),
        ]

        for path in extra_python_path:
            Utils.prepend_env_value('PYTHONPATH', path, env=env)

########################
## END helper functions
########################

class Elasticsearch(object):
    def __init__(self):
        self.es_executable = os.path.join(env_mgr.pro_program_dir,
                                          'elasticsearch', 'bin', 'elasticsearch')

        self.es_logs_dir = os.path.join(env_mgr.pro_data_dir, 'search', 'logs')
        self.es_data_dir = os.path.join(env_mgr.pro_data_dir, 'search', 'data')

    def start(self):
        '''Start Elasticsearch. We use -D command line args to specify the
        location of logs and data

        '''
        argv = [
            self.es_executable,
            '-Des.path.logs=%s' % self.es_logs_dir,
            '-Des.path.data=%s' % self.es_data_dir,
        ]
        Utils.run_argv(argv, suppress_stdout=True, suppress_stderr=True)

    def stop(self):
        Utils.pkill('org.elasticsearch.bootstrap.ElasticSearch')


class DBConf(object):
    '''Abstract class for database configuration'''
    TYPE_SQLITE = 'sqlite'
    TYPE_MYSQL = 'mysql'

    DB_SECTION = 'DATABASE'
    def __init__(self, db_type):
        self.db_type = db_type

    def generate_conf(self, config):
        raise NotImplementedError

    def generate_config_text(self):
        config = Utils.read_config()
        self.generate_conf(config)

        buf = io.StringIO()
        config.write(buf)
        buf.flush()

        return buf.getvalue()

class MySQLDBConf(DBConf):
    def __init__(self):
        DBConf.__init__(self, self.TYPE_MYSQL)

        self.mysql_host = ''
        self.mysql_port = ''
        self.mysql_user = ''
        self.mysql_password = ''
        self.mysql_db = ''

        self.conn = None

    def generate_conf(self, config):
        # [DATABASE]
        # type=mysql
        # path=x.db
        # username=seafevents
        # password=seafevents
        # name=seafevents
        # host=localhost
        config.add_section(self.DB_SECTION)
        config.set(self.DB_SECTION, 'type', 'mysql')

        if self.mysql_host:
            config.set(self.DB_SECTION, 'host', self.mysql_host)

        if self.mysql_port:
            config.set(self.DB_SECTION, 'port', str(self.mysql_port))

        config.set(self.DB_SECTION, 'username', self.mysql_user)
        config.set(self.DB_SECTION, 'password', self.mysql_password)
        config.set(self.DB_SECTION, 'name', self.mysql_db)

    def exec_sql(self, sql):
        cursor = self.conn.cursor()
        try:
            cursor.execute(sql)
        except Exception as e:
            if isinstance(e, pymysql.err.OperationalError):
                Utils.error('Failed to create extra tables: %s' % e.args[1])
            else:
                Utils.error('Failed to create extra tables: %s' % e)

    def get_conn(self):
        print('host is', self.mysql_host)
        print('port is', self.mysql_port)
        kwargs = dict(user=self.mysql_user,
                      passwd=self.mysql_password,
                      db=self.mysql_db)
        if self.mysql_port:
            kwargs['port'] = self.mysql_port
        if self.mysql_host:
            kwargs['host'] = self.mysql_host

        try:
            self.conn = pymysql.connect(**kwargs)
        except Exception as e:
            if isinstance(e, pymysql.err.OperationalError):
                Utils.error('Failed to connect to mysql database %s: %s' % (self.mysql_db, e.args[1]))
            else:
                Utils.error('Failed to connect to mysql database %s: %s' % (self.mysql_db, e))

class SQLiteDBConf(DBConf):
    def __init__(self):
        DBConf.__init__(self, self.TYPE_SQLITE)
        self.db_path = os.path.join(env_mgr.pro_data_dir, 'seafevents.db')

    def generate_conf(self, config):
        # [DATABASE]
        # type=sqlite3
        # path=x.db
        config.add_section(self.DB_SECTION)
        config.set(self.DB_SECTION, 'type', 'sqlite3')
        config.set(self.DB_SECTION, 'path', self.db_path)


class ProfessionalConfigurator(object):
    '''Main abstract class for the config process '''
    def __init__(self, args, migrate=False):
        self.args = args
        self.migrate = migrate
        self.db_type = ''
        self.db_config = None   # database config strategy
        self.seafevents_conf = os.path.join(env_mgr.central_config_dir, 'seafevents.conf')

    def check_pre_condition(self):
        raise NotImplementedError

    def config(self):
        raise NotImplementedError

    def generate(self):
        self.generate_seafevents_conf()

    def generate_seafevents_conf(self):
        template = '''\
%(db_config_text)s

[AUDIT]
enabled = true

[INDEX FILES]
enabled = true
interval = 10m

highlight = fvh

## If true, indexes the contents of office/pdf files while updating search index
## Note: If you change this option from "false" to "true", then you need to clear the search index and update the index again. See the FAQ for details.
index_office_pdf = true

[SEAHUB EMAIL]
enabled = true

## interval of sending Seahub email. Can be s(seconds), m(minutes), h(hours), d(days)
interval = 30m

# Enable statistics
[STATISTICS]
enabled=true
'''
        db_config_text = self.db_config.generate_config_text()
        if not os.path.exists(env_mgr.pro_data_dir):
            os.makedirs(env_mgr.pro_data_dir)
        os.chmod(env_mgr.pro_data_dir, 0o700)

        with open(self.seafevents_conf, 'w') as fp:
            fp.write(template % dict(db_config_text=db_config_text))

class MigratingProfessionalConfigurator(ProfessionalConfigurator):
    '''This scripts is used standalone to migrate from community version to
    professional version

    '''
    def __init__(self, args):
        ProfessionalConfigurator.__init__(self, args, migrate=True)

    def check_pre_condition(self):
        pass

    def config(self):
        self.detect_db_type()
        self.update_avatars_link()

    def detect_db_type(self):
        '''Read database info from seahub_settings.py'''
        sys.path.insert(0, env_mgr.central_config_dir)
        try:
            from seahub_settings import DATABASES # pylint: disable=F0401
        except ImportError:
            print('Failed to import "DATABASES" from seahub_settings.py, assuming sqlite3')
            self.db_config = SQLiteDBConf()
            return

        try:
            default_config = DATABASES['default']
            if default_config['ENGINE'] == 'django.db.backends.mysql':
                db_config = MySQLDBConf()
                db_config.mysql_host = default_config.get('HOST', '')
                db_config.mysql_port = default_config.get('PORT', '')
                db_config.mysql_user = default_config.get('USER', '')
                db_config.mysql_password = default_config.get('PASSWORD', '')
                db_config.mysql_db = default_config['NAME']

                if db_config.mysql_port:
                    db_config.mysql_port = int(db_config.mysql_port)

                print('Your seafile server is using mysql')

                self.db_config = db_config
            else:
                print('Your seafile server is using sqlite3')
                self.db_config = SQLiteDBConf()

        except KeyError:
            Utils.error('Error in your config %s' % \
                        os.path.join(env_mgr.top_dir, 'seahub_settings.py'))

    def update_avatars_link(self):
        minor_upgrade_script = os.path.join(env_mgr.install_path, 'upgrade', 'minor-upgrade.sh')
        argv = [
            minor_upgrade_script
        ]

        if Utils.run_argv(argv) != 0:
            Utils.error('failed to update avatars folder')


class SetupProfessionalConfigurator(ProfessionalConfigurator):
    '''This script is invokded by setup-seafile.sh/setup-seafile-mysql.sh to
    generate seafile pro related conf

    To setup sqlite3:
    ./pro.py setup

    To setup mysql:
    ./pro.py setup --mysql
                   --mysql_host=
                   --mysql_port=
                   --mysql_user=
                   --mysql_password=
                   --mysql_db=

    '''
    def __init__(self, args):
        ProfessionalConfigurator.__init__(self, args, migrate=False)

    def config(self):
        if self.args.mysql:
            db_config = MySQLDBConf()
            db_config.mysql_host = self.args.mysql_host
            db_config.mysql_port = self.args.mysql_port
            db_config.mysql_user = self.args.mysql_user
            db_config.mysql_password = self.args.mysql_password
            db_config.mysql_db = self.args.mysql_db
        else:
            db_config = SQLiteDBConf()

        self.db_config = db_config

    def check_pre_condition(self):
        pass

def do_setup(args):
    global pro_config

    if args.migrate:
        pro_config = MigratingProfessionalConfigurator(args)
    else:
        pro_config = SetupProfessionalConfigurator(args)

    pro_config.check_pre_condition()
    pro_config.config()
    pro_config.generate()

def handle_search_commands(args):
    '''provide search related utility'''
    if args.update:
        update_search_index()
    elif args.clear:
        delete_search_index()

def get_seafes_env():
    env = env_mgr.get_seahub_env()
    events_conf = os.path.join(env_mgr.central_config_dir, 'seafevents.conf')

    env['EVENTS_CONFIG_FILE'] = events_conf

    return env

def update_search_index():
    argv = [
        Utils.get_python_executable(),
        '-m', 'seafes.index_local',
        '--loglevel', 'debug',
        'update',
    ]

    Utils.info('\nUpdating search index, this may take a while...\n')

    Utils.run_argv(argv, env=get_seafes_env())

def delete_search_index():
    choice = None
    while choice not in ('y', 'n', ''):
        prompt = 'Delete seafile search index ([y]/n)? '
        choice = input(prompt).strip()

    if choice == 'n':
        return

    argv = [
        Utils.get_python_executable(),
        '-m', 'seafes.index_local',
        '--loglevel', 'debug',
        'clear',
    ]

    Utils.info('\nDelete search index, this may take a while...\n')

    Utils.run_argv(argv, env=get_seafes_env())

def handle_ldap_sync_commands(args):
    if args.test:
        argv = [
            Utils.get_python_executable(),
            '-m', 'seafevents.ldap_syncer.run_ldap_sync',
            '-t',
        ]
    else:
        argv = [
            Utils.get_python_executable(),
            '-m', 'seafevents.ldap_syncer.run_ldap_sync',
        ]

    Utils.run_argv(argv, env=env_mgr.get_seahub_env())

def handle_virus_scan_commands(args):
    argv = [
        Utils.get_python_executable(),
        '-m', 'seafevents.virus_scanner.run_virus_scan',
        '-c', os.path.join(env_mgr.central_config_dir, 'seafevents.conf'),
    ]

    Utils.run_argv(argv, env=env_mgr.get_seahub_env())

pro_config = None
env_mgr = EnvManager()

def main():
    try:
        import argparse
    except ImportError:
        sys.path.insert(0, glob.glob(os.path.join(env_mgr.pro_pylibs_dir, 'argparse*.egg'))[0])
        import argparse

    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(title='subcommands', description='')

    # setup
    parser_setup = subparsers.add_parser('setup', help='Setup extra components of seafile pro')
    parser_setup.set_defaults(func=do_setup)
    parser_setup.add_argument('--migrate', help='migrate from community version', action='store_true')

    # for non-migreate setup
    parser_setup.add_argument('--mysql', help='use mysql', action='store_true')
    parser_setup.add_argument('--mysql_host')
    parser_setup.add_argument('--mysql_port')
    parser_setup.add_argument('--mysql_user')
    parser_setup.add_argument('--mysql_password')
    parser_setup.add_argument('--mysql_db')

    # search
    parser_search = subparsers.add_parser('search', help='search related utility commands')
    parser_search.add_argument('--update', help='update seafile search index', action='store_true')
    parser_search.add_argument('--clear', help='delete seafile search index', action='store_true')
    parser_search.set_defaults(func=handle_search_commands)

    # ldapsync
    parser_ldap_sync = subparsers.add_parser('ldapsync', help='ldap sync commands')
    parser_ldap_sync.add_argument('-t', '--test', help='test ldap sync', action='store_true')
    parser_ldap_sync.set_defaults(func=handle_ldap_sync_commands)

    # virus scan
    parser_virus_scan = subparsers.add_parser('virus_scan', help='virus scan commands')
    parser_virus_scan.set_defaults(func=handle_virus_scan_commands)

    if len(sys.argv) == 1:
        print(parser.format_help())
        return

    args = parser.parse_args()
    args.func(args)

if __name__ == '__main__':
    main()

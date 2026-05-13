import logging
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.event import contains as has_event_listener, listen as add_event_listener
from sqlalchemy.exc import DisconnectionError
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import Pool
from sqlalchemy.ext.automap import automap_base

from seahub_io.app.config import MYSQL_SEAHUB_DB_NAME, MYSQL_SEAFILE_DB_NAME, MYSQL_CCNET_DB_NAME, MYSQL_DB_HOST, \
    MYSQL_DB_PORT, MYSQL_DB_PWD, MYSQL_DB_USER
    

logger = logging.getLogger(__name__)


# base class of model classes in events.models and stats.models
class Base(DeclarativeBase):
    pass


SeafBase = automap_base()


def create_engine_from_env(db='seahub'):
    '''
    Basicly, there are 3 different databses in a mysql-server involved in all seafile project.
    seahub_db, seafile_db, ccnet_db which are assigned in .env file.
    
    :param db:  The name of database
    :return:  An engine by which can make db sessions
    '''
    need_connection_pool_fix = True

    db_name = ''
    if db == 'seahub':
        db_name = MYSQL_SEAHUB_DB_NAME
    elif db == 'seafile':
        db_name = MYSQL_SEAFILE_DB_NAME
    elif db == 'ccnet':
        db_name = MYSQL_CCNET_DB_NAME
        
    db_host = MYSQL_DB_HOST
    db_port = MYSQL_DB_PORT
    db_user = MYSQL_DB_USER
    db_pwd = MYSQL_DB_PWD
    
    if not (db_name and db_host and db_port and db_user):
        raise RuntimeError('Database configured error')
    
    db_url = "mysql+pymysql://%s:%s@%s:%s/%s?charset=utf8" % (db_user, quote_plus(db_pwd), db_host, db_port, db_name)
    kwargs = dict(pool_recycle=300, echo=False, echo_pool=False)

    engine = create_engine(db_url, **kwargs)

    if need_connection_pool_fix and not has_event_listener(Pool, 'checkout', ping_connection):
        # We use has_event_listener to double check in case we call create_engine
        # multipe times in the same process.
        add_event_listener(Pool, 'checkout', ping_connection)

    return engine


# check user source
def init_db_session_class(db='seahub'):
    """Configure Session class for mysql according to the env."""
    try:
        engine = create_engine_from_env(db=db)
    except Exception as e:
        logger.error(e)
        raise RuntimeError("create db engine error: %s" % e)

    Session = sessionmaker(bind=engine)
    return Session


# check user source
def create_db_tables():
    # create seahub_io tables if not exists.
    try:
        engine = create_engine_from_env()
    except Exception as e:
        logger.error(e)
        raise RuntimeError("create db engine error: %s" % e)

    try:
        Base.metadata.create_all(engine)
    except Exception as e:
        logger.error("Failed to create database tables: %s" % e)
        raise RuntimeError("Failed to create database tables")
    engine.dispose()

# check user sources
def prepare_db_tables():
    # reflect the seafile_db tables
    try:
        engine = create_engine_from_env(db='seafile')
    except Exception as e:
        logger.error(e)
        raise RuntimeError("create db engine error: %s" % e)

    SeafBase.prepare(autoload_with=engine)
    engine.dispose()


# This is used to fix the problem of "MySQL has gone away" that happens when
# mysql server is restarted or the pooled connections are closed by the mysql
# server beacause being idle for too long.
#
# See http://stackoverflow.com/a/17791117/1467959
def ping_connection(dbapi_connection, connection_record, connection_proxy): # pylint: disable=unused-argument
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("SELECT 1")
        cursor.close()
    except:
        logger.info('fail to ping database server, disposing all cached connections')
        connection_proxy._pool.dispose() # pylint: disable=protected-access

        # Raise DisconnectionError so the pool would create a new connection
        raise DisconnectionError()

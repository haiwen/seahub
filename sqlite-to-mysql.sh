#!/bin/sh

# Before run the script, you should have created seafile-meta
# database.
# Choose NO when promote to create superuser.

# The python path. Change to your path
export PYTHONPATH=/usr/lib/python2.6/site-packages:thirdpart

# The database configuration. Change to your config
export DBNAME='seafile-meta'
export DBUSER='seafile-user'
export DBPASSWD='seafile'

# Delete the exist seahub tables in database
python batch-delete.py
if [ $? -eq 1 ]; then
    exit 1
fi

DUMP_FILE='dump_seahub.json'
SETTINGS_COPY='mysqlsettings.py'
SETTINGS_MODULE='mysqlsettings'


cp settings.py $SETTINGS_COPY
sed -i "/DATABASE_ENGINE/c\DATABASE_ENGINE = 'mysql'" $SETTINGS_COPY
sed -i "/DATABASE_NAME/c\DATABASE_NAME = '$DBNAME'" $SETTINGS_COPY
sed -i "/DATABASE_USER/c\DATABASE_USER = '$DBUSER'" $SETTINGS_COPY
sed -i "/DATABASE_PASSWORD/c\DATABASE_PASSWORD = '$DBPASSWD'" $SETTINGS_COPY

./manage.py syncdb --settings=$SETTINGS_MODULE

./manage.py dumpdata > $DUMP_FILE --settings=settings && ./manage.py loaddata $DUMP_FILE --settings=$SETTINGS_MODULE && echo '[DONE]' || echo '[FAILED]'

rm $DUMP_FILE $SETTINGS_COPY 2> /dev/null

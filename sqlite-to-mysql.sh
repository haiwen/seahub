#!/bin/sh

# Before run the script, edit PYTHONPATH and database configuration
# Choose NO when promote to create superuser.

# The python path. Change to your path
export PYTHONPATH=/usr/lib/python2.6/site-packages:thirdpart

# The database configuration. Change to your config
export DBNAME='seahub-meta'
export DBUSER='seafile-user'
export DBPASSWD='seafile'

# Delete the exist seahub tables in database
python batch-delete.py
if [ $? -eq 1 ]; then
    exit 1
fi

# Save sqlite settings
cp settings.py settings.py.sqlite

DUMP_FILE='dump_seahub.xml'
SETTINGS_COPY='mysqlsettings.py'
SETTINGS_MODULE='mysqlsettings'

cp settings.py $SETTINGS_COPY
sed -i "/DATABASE_ENGINE/c\DATABASE_ENGINE = 'mysql'" $SETTINGS_COPY
sed -i "/DATABASE_NAME/c\DATABASE_NAME = '$DBNAME'" $SETTINGS_COPY
sed -i "/DATABASE_USER/c\DATABASE_USER = '$DBUSER'" $SETTINGS_COPY
sed -i "/DATABASE_PASSWORD/c\DATABASE_PASSWORD = '$DBPASSWD'" $SETTINGS_COPY

./manage.py syncdb --settings=$SETTINGS_MODULE

./manage.py dumpdata --format=xml > $DUMP_FILE --settings=settings && ./manage.py loaddata $DUMP_FILE --settings=$SETTINGS_MODULE && echo '[DONE]' || echo '[FAILED]'

# Save mysql settings, and use it as curernt settings
cp $SETTINGS_COPY settings.py.mysql
cp $SETTINGS_COPY settings.py

# Remove temp file
rm $DUMP_FILE $SETTINGS_COPY 2> /dev/null

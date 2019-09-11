# Copyright (c) 2012-2016 Seafile Ltd.
import base64
from datetime import datetime
import hashlib

from django.core.management.base import BaseCommand
from django.db import connection, transaction

from seahub.avatar.models import Avatar
from seahub.avatar.settings import AUTO_GENERATE_AVATAR_SIZES
from seahub.utils.timeutils import value_to_db_datetime


class AvatarNotFoundError(Exception):
    pass


class Command(BaseCommand):
    help = "Migrate avatars from file system to database."

    def __init__(self):
        self.table = 'avatar_uploaded'
        self.name_column = 'filename'
        self.name_md5_column = 'filename_md5'
        self.data_column = 'data'
        self.size_column = 'size'
        self.mtime_column = 'mtime'

        super(Command, self).__init__()

    def handle(self, **options):
        for avatar in Avatar.objects.all():
            try:
                self._save(avatar.avatar.name, avatar.avatar)
                print("SUCCESS: migrated Avatar path=%s user=%s" % (avatar.avatar.name, avatar.emailuser))
            except AvatarNotFoundError:
                print("ERROR: Avatar file not found: path=%s user=%s. Skip." % (avatar.avatar.name, avatar.emailuser))
                continue

            # try:
            #     for size in AUTO_GENERATE_AVATAR_SIZES:
            #         avatar.create_thumbnail(size)
            #     # print "Rebuilt Avatar id=%s at size %s." % (avatar.id, str(AUTO_GENERATE_AVATAR_SIZES))
            # except Exception:
            #     pass

    def _save(self, name, content):
        """
        Save the given content as file with the specified name.  Backslashes
        in the name will be converted to forward '/'.
        """
        name = name.replace('\\', '/')
        name_md5 = hashlib.md5(name.encode('utf-8')).hexdigest()
        try:
            binary = content.read()
        except AttributeError as IOError:
            raise AvatarNotFoundError

        size = len(binary)
        encoded = base64.b64encode(binary)
        mtime = value_to_db_datetime(datetime.today())

        with transaction.atomic(using='default'):
            cursor = connection.cursor()
            if self.exists(name):
                query = 'UPDATE %(table)s SET %(data_column)s = %%s, ' + \
                        '%(size_column)s = %%s, %(mtime_column)s = %%s ' + \
                        'WHERE %(name_md5_column)s = %%s'
                query %= self.__dict__
                cursor.execute(query, [encoded, size, mtime, name])
            else:
                query = 'INSERT INTO %(table)s (%(name_column)s, ' + \
                    '%(name_md5_column)s, %(data_column)s, %(size_column)s, '+ \
                    '%(mtime_column)s) VALUES (%%s, %%s, %%s, %%s, %%s)'
                query %= self.__dict__
                cursor.execute(query, (name, name_md5, encoded, size, mtime))

        return name

    def exists(self, name):
        name_md5 = hashlib.md5(name.encode('utf-8')).hexdigest()
        query = 'SELECT COUNT(*) FROM %(table)s WHERE %(name_md5_column)s = %%s'
        query %= self.__dict__
        cursor = connection.cursor()
        cursor.execute(query, [name_md5])
        row = cursor.fetchone()
        return int(row[0]) > 0

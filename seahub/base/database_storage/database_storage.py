# Copyright (c) 2012-2016 Seafile Ltd.
# DatabaseStorage for django.
# 2011 (c) Mike Mueller <mike@subfocal.net>
# 2009 (c) GameKeeper Gambling Ltd, Ivanov E.

from django.core.exceptions import ImproperlyConfigured, ObjectDoesNotExist
from django.core.files.storage import Storage
from django.core.files import File
from django.db import connection, transaction

import base64
import hashlib
import io
import urllib.parse
from datetime import datetime

from seahub.utils.timeutils import value_to_db_datetime

class DatabaseStorage(Storage):
    """
    Implements the Django Storage API for storing files in the database,
    rather than on the filesystem.  Uses the Django database layer, so any
    database supported by Django should theoretically work.

    Usage: Create an instance of DatabaseStorage and pass it as the storage
    parameter of your FileField, ImageField, etc.::

        image = models.ImageField(
            null=True,
            blank=True,
            upload_to='attachments/',
            storage=DatabaseStorage(options=DBS_OPTIONS),
        )

    Files submitted using this field will be saved into the default Django
    database, using the options specified in the constructor.  The upload_to
    path will be prepended to uploads, so that the file 'bar.png' would be
    retrieved later as 'attachments/bar.png' in this example.

    Uses the default get_available_name strategy, so duplicate filenames will
    be silently renamed to foo_1.jpg, foo_2.jpg, etc.

    You are responsible for creating a table in the database with the
    following columns:

        filename VARCHAR(256) NOT NULL PRIMARY KEY,
        data TEXT NOT NULL,
        size INTEGER NOT NULL,

    The best place to do this is probably in your_app/sql/foo.sql, which will
    run during syncdb.  The length 256 is up to you, you can also pass a
    max_length parameter to FileFields to be consistent with your column here.
    On SQL Server, you should probably use nvarchar to support unicode.

    Remember, this is not designed for huge objects.  It is probably best used
    on files under 1MB in size.  All files are base64-encoded before being
    stored, so they will use 1.33x the storage of the original file.

    Here's an example view to serve files stored in the database.

      def image_view(request, filename):
          # Read file from database
          storage = DatabaseStorage(options=DBS_OPTIONS)
          image_file = storage.open(filename, 'rb')
          if not image_file:
              raise Http404
          file_content = image_file.read()

          # Prepare response
          content_type, content_encoding = mimetypes.guess_type(filename)
          response = HttpResponse(content=file_content, mimetype=content_type)
          response['Content-Disposition'] = 'inline; filename=%s' % filename
          if content_encoding:
              response['Content-Encoding'] = content_encoding
          return response
    """

    def __init__(self, options):
        """
        Create a DatabaseStorage object with the specified options dictionary.

        Required options:

            'table': The name of the database table for file storage.
            'base_url': The base URL where database files should be found.
                        This is used to construct URLs for FileFields and
                        you will need to define a view that handles requests
                        at this location (example given above).

        Allowed options:

            'name_column': Name of the filename column (default: 'filename')
            'data_column': Name of the data column (default: 'data')
            'size_column': Name of the size column (default: 'size')

                      'data_column', 'size_column', 'base_url' keys.
        """

        required_keys = [
            'table',
            'base_url',
        ]
        allowed_keys = [
            'name_column',
            'name_md5_column',
            'data_column',
            'size_column',
            'mtime_column',
        ]
        for key in required_keys:
            if key not in options:
                raise ImproperlyConfigured(
                    'DatabaseStorage missing required option: ' + key)
        for key in options:
            if key not in required_keys and key not in allowed_keys:
                raise ImproperlyConfigured(
                    'Unrecognized DatabaseStorage option: ' + key)

        # Note: These fields are used as keys in string substitutions
        # throughout this class.  If you change a name here, be sure to update
        # all the affected format strings.
        self.table = options['table']
        self.base_url = options['base_url']
        self.name_column = options.get('name_column', 'filename')
        self.name_md5_column = options.get('name_md5_column', 'filename_md5')
        self.data_column = options.get('data_column', 'data')
        self.size_column = options.get('size_column', 'size')
        self.mtime_column = options.get('mtime_column', 'mtime')

    def _open(self, name, mode='rb'):
        """
        Open a file stored in the database.  name should be the full name of
        the file, including the upload_to path that may have been used.
        Path separator should always be '/'.  mode should always be 'rb'.

        Returns a Django File object if found, otherwise None.
        """
        assert mode == 'rb', "DatabaseStorage open mode must be 'rb'."

        name_md5 = hashlib.md5(name.encode('utf-8')).hexdigest()

        query = 'SELECT %(data_column)s FROM %(table)s ' + \
                'WHERE %(name_md5_column)s = %%s'
        query %= self.__dict__
        cursor = connection.cursor()
        cursor.execute(query, [name_md5])
        row = cursor.fetchone()
        if row is None:
            return None

        inMemFile = io.BytesIO(base64.b64decode(row[0]))
        inMemFile.name = name
        inMemFile.mode = mode

        return File(inMemFile)

    def _save(self, name, content):
        """
        Save the given content as file with the specified name.  Backslashes
        in the name will be converted to forward '/'.
        """
        name = name.replace('\\', '/')
        name_md5 = hashlib.md5(name.encode('utf-8')).hexdigest()
        binary = content.read()

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

    def delete(self, name):
        if self.exists(name):
            with transaction.atomic(using='default'):
                name_md5 = hashlib.md5(name.encode('utf-8')).hexdigest()
                query = 'DELETE FROM %(table)s WHERE %(name_md5_column)s = %%s'
                query %= self.__dict__
                connection.cursor().execute(query, [name_md5])

    def path(self, name):
        raise NotImplementedError('DatabaseStorage does not support path().')

    def url(self, name):
        if self.base_url is None:
            raise ValueError("This file is not accessible via a URL.")
        result = urllib.parse.urljoin(self.base_url, name).replace('\\', '/')
        return result

    def size(self, name):
        "Get the size of the given filename or raise ObjectDoesNotExist."
        name_md5 = hashlib.md5(name.encode('utf-8')).hexdigest()
        query = 'SELECT %(size_column)s FROM %(table)s ' + \
                'WHERE %(name_md5_column)s = %%s'
        query %= self.__dict__
        cursor = connection.cursor()
        cursor.execute(query, [name_md5])
        row = cursor.fetchone()
        if not row:
            raise ObjectDoesNotExist(
                "DatabaseStorage file not found: %s" % name)
        return int(row[0])

    def modified_time(self, name):
        "Get the modified time of the given filename or raise ObjectDoesNotExist."
        name_md5 = hashlib.md5(name.encode('utf-8')).hexdigest()
        query = 'SELECT %(mtime_column)s FROM %(table)s ' + \
                'WHERE %(name_md5_column)s = %%s'
        query %= self.__dict__
        cursor = connection.cursor()
        cursor.execute(query, [name_md5])
        row = cursor.fetchone()
        if not row:
            raise ObjectDoesNotExist(
                "DatabaseStorage file not found: %s" % name)
        
        return row[0]
    

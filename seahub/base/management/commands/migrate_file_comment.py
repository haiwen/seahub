# Copyright (c) 2012-2016 Seafile Ltd.
import uuid

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.utils import OperationalError

from seahub.base.models import FileComment
from seahub.tags.models import FileUUIDMap

def random_key():
    return uuid.uuid4().hex[:6]

class Command(BaseCommand):
    help = "Migrate base_filecomment schema which is changed in version 6.3."

    def migrate_schema(self):
        mysql = False
        pgsql = False
        sqlite = False
        engine = settings.DATABASES['default']['ENGINE']
        if 'mysql' in engine:
            mysql = True
        elif 'sqlite' in engine:
            sqlite = True
        elif 'pgsql' in engine or 'postgres' in engine or 'psycopg' in engine:
            pgsql = True
        else:
            print('Unsupported database. Exit.')
            return

        print('Start to update schema...')

        comments = list(FileComment.objects.raw('SELECT * from base_filecomment'))

        with connection.cursor() as cursor:
            sql = 'ALTER TABLE base_filecomment RENAME TO base_filecomment_backup_%s' % (random_key())
            cursor.execute(sql)
            print(sql)

            print('')

            if mysql:
                sql = '''CREATE TABLE `base_filecomment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `author` varchar(255) NOT NULL,
  `comment` longtext NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `uuid_id` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `base_filecomment_uuid_id_%s_fk_tags_fileuuidmap_uuid` (`uuid_id`),
  KEY `base_filecomment_author_%s` (`author`),
  CONSTRAINT `base_filecomment_uuid_id_%s_fk_tags_fileuuidmap_uuid` FOREIGN KEY (`uuid_id`) REFERENCES `tags_fileuuidmap` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8
            ''' % (random_key(), random_key(), random_key())

                cursor.execute(sql)
                print(sql)

            if pgsql:
                sql = '''
CREATE TABLE IF NOT EXISTS "base_filecomment"
(
    "id"         serial primary key,
    "author"     varchar(255) NOT NULL,
    "comment"    text         NOT NULL,
    "created_at" timestamptz  NOT NULL,
    "updated_at" timestamptz  NOT NULL,
    "uuid_id"    char(32)     NOT NULL,
    "detail"     text         NOT NULL,
    "resolved"   boolean      NOT NULL,
    CONSTRAINT "base_filecomment_uuid_id_fk_tags_fileuuidmap_uuid" FOREIGN KEY ("uuid_id") REFERENCES "tags_fileuuidmap" ("uuid")
);
CREATE INDEX IF NOT EXISTS "base_filecomment_uuid_id_4f9a2ca2_fk_tags_fileuuidmap_uuid" ON "base_filecomment" ("uuid_id");
CREATE INDEX IF NOT EXISTS "base_filecomment_author_8a4d7e91" ON "base_filecomment" ("author");
CREATE INDEX IF NOT EXISTS "base_filecomment_resolved_e0717eca" ON "base_filecomment" ("resolved");
            '''

                cursor.execute(sql)
                print(sql)

            if sqlite:
                sql = '''CREATE TABLE "base_filecomment" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "author" varchar(255) NOT NULL, "comment" text NOT NULL, "created_at" datetime NOT NULL, "updated_at" datetime NOT NULL, "uuid_id" char(32) NOT NULL REFERENCES "tags_fileuuidmap" ("uuid"))
                '''
                cursor.execute(sql)
                print(sql)

                sql = '''CREATE INDEX "base_filecomment_%s" ON "base_filecomment" ("author")''' % random_key()
                cursor.execute(sql)
                print(sql)

                sql = '''CREATE INDEX "base_filecomment_%s" ON "base_filecomment" ("uuid_id") ''' % random_key()
                cursor.execute(sql)
                print(sql)

        print('Start to migate comments data...')
        for c in comments:
            repo_id = c.repo_id
            parent_path = c.parent_path
            filename = c.item_name
            author = c.author
            comment = c.comment
            created_at = c.created_at
            updated_at = c.updated_at

            uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, parent_path, filename, False)
            FileComment(uuid=uuid, author=author, comment=comment,
                        created_at=created_at, updated_at=updated_at).save()
            print('migrated comment ID: %d' % c.pk)

        print('Done')

    def handle(self, *args, **options):
        # check table column `uuid`
        try:
            res = FileComment.objects.raw('SELECT uuid_id from base_filecomment limit 1')
            if 'uuid_id' in res.columns:
                print('base_filecomment is already migrated, exit.')
        except OperationalError:
            self.migrate_schema()

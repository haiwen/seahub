from datetime import datetime

from django.db import connection
from django.core.management.base import BaseCommand

from seahub.utils.seafile_db import get_seafile_db_name


class Command(BaseCommand):
    help = "Clear invalid data when repo deleted"

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', type=str, choices=['true', 'false'], default='false',
                            help='Whether to only print the log instead of actually deleting the data')

    def get_seafile_repo_count(self, table_name):
        db_name, error_msg = get_seafile_db_name()
        if error_msg:
            self.stderr.write('[%s] Failed to get seafile db name, error: %s' % (datetime.now(), error_msg))
            return

        sql = """SELECT COUNT(1) FROM `%s`.`%s`""" % (db_name, table_name)
        try:
            with connection.cursor() as cursor:
                cursor.execute(sql)
                repo_count = int(cursor.fetchone()[0])
        except Exception as e:
            self.stderr.write('[%s] Failed to count the number of %s, error: %s.' % (datetime.now(), table_name, e))
            return

        return repo_count

    def query_seafile_repo_ids(self, count, table_name):
        db_name, error_msg = get_seafile_db_name()
        if error_msg:
            self.stderr.write('[%s] Failed to get seafile db name, error: %s' % (datetime.now(), error_msg))
            return

        repo_ids = set()
        sql = """SELECT repo_id FROM `%s`.`%s` LIMIT %%s, %%s""" % (db_name, table_name)
        for i in range(0, count, 1000):
            try:
                with connection.cursor() as cursor:
                    cursor.execute(sql, (i, 1000))
                    res = cursor.fetchall()
            except Exception as e:
                self.stderr.write('[%s] Failed to query all repo_id from %s, error: %s.' %
                                  (datetime.now(), table_name, e))
                return
            for repo_id, *_ in res:
                repo_ids.add(repo_id)

        return repo_ids

    def get_repo_id_count(self, table_name):
        self.stdout.write('[%s] Count the number of repo_id of %s.' % (datetime.now(), table_name))
        sql = """SELECT COUNT(DISTINCT(repo_id)) FROM %s""" % table_name
        try:
            with connection.cursor() as cursor:
                cursor.execute(sql)
                repo_id_count = int(cursor.fetchone()[0])
        except Exception as e:
            self.stderr.write('[%s] Failed to count the number of repo_id of %s, error: %s.' %
                              (datetime.now(), table_name, e))
            return

        self.stdout.write('[%s] The number of repo_id of %s: %s.' % (datetime.now(), table_name, repo_id_count))
        return repo_id_count

    def query_invalid_repo_ids(self, all_repo_ids, repo_id_count, table_name):
        self.stdout.write('[%s] Start to query all repo_id of %s.' % (datetime.now(), table_name))
        sql = """SELECT DISTINCT(repo_id) FROM %s LIMIT %%s, %%s""" % table_name
        repo_ids = list()
        invalid_repo_ids = list()
        for i in range(0, repo_id_count, 1000):
            try:
                with connection.cursor() as cursor:
                    cursor.execute(sql, (i, 1000))
                    res = cursor.fetchall()
            except Exception as e:
                self.stderr.write('[%s] Failed to query repo_id from %s, error: %s.' %
                                  (datetime.now(), table_name, e))
                return

            for repo_id, *_ in res:
                repo_ids.append(repo_id)
                if repo_id not in all_repo_ids:
                    invalid_repo_ids.append(repo_id)

        self.stdout.write('[%s] Successfully queried all repo_id of %s, result length: %s' %
                          (datetime.now(), table_name, len(repo_ids)))

        self.stdout.write('[%s] The number of invalid repo_id of %s: %s' %
                          (datetime.now(), table_name, len(invalid_repo_ids)))

        return invalid_repo_ids

    def clean_up_invalid_records(self, dry_run, invalid_repo_ids, table_name):
        self.stdout.write('[%s] Start to count invalid records of %s.' % (datetime.now(), table_name))
        invalid_records_count = 0
        if invalid_repo_ids:
            count_sql = """SELECT COUNT(1) FROM %s WHERE repo_id IN %%s""" % table_name
            try:
                with connection.cursor() as cursor:
                    cursor.execute(count_sql, (invalid_repo_ids,))
                    invalid_records_count = int(cursor.fetchone()[0])
            except Exception as e:
                self.stderr.write('[%s] Failed to count invalid records of %s, error: %s.' %
                                  (datetime.now(), table_name, e))
                return False

        self.stdout.write('[%s] The number of invalid records of %s: %s' %
                          (datetime.now(), table_name, invalid_records_count))

        self.stdout.write('[%s] Start to clean up invalid records of %s...' % (datetime.now(), table_name))
        if dry_run == 'false':
            clean_sql = """DELETE FROM %s WHERE repo_id IN %%s LIMIT 10000""" % table_name
            for i in range(0, invalid_records_count, 10000):
                try:
                    with connection.cursor() as cursor:
                        cursor.execute(clean_sql, (invalid_repo_ids,))
                except Exception as e:
                    self.stderr.write('[%s] Failed to clean up invalid records of %s, error: %s.' %
                                      (datetime.now(), table_name, e))
                    return False

        self.stdout.write('[%s] Successfully cleaned up invalid records of %s.' % (datetime.now(), table_name))
        return True

    def clean_up_invalid_uuid_records(self, dry_run, invalid_uuids, table_name):
        self.stdout.write('[%s] Start to count invalid records of %s.' % (datetime.now(), table_name))
        invalid_records_count = 0
        if invalid_uuids:
            if table_name == 'file_tags_filetags':
                count_sql = """SELECT COUNT(1) FROM %s WHERE file_uuid_id IN %%s""" % table_name
            else:
                count_sql = """SELECT COUNT(1) FROM %s WHERE uuid_id IN %%s""" % table_name
            try:
                with connection.cursor() as cursor:
                    cursor.execute(count_sql, (invalid_uuids,))
                    invalid_records_count = int(cursor.fetchone()[0])
            except Exception as e:
                self.stderr.write('[%s] Failed to count invalid records of %s, error: %s.' %
                                  (datetime.now(), table_name, e))
                return False

        self.stdout.write('[%s] The number of invalid records of %s: %s' %
                          (datetime.now(), table_name, invalid_records_count))

        self.stdout.write('[%s] Start to clean up invalid records of %s...' %
                          (datetime.now(), table_name))
        if dry_run == 'false':
            if table_name == 'file_tags_filetags':
                clean_sql = """DELETE FROM %s WHERE file_uuid_id IN %%s LIMIT 10000""" % table_name
            else:
                clean_sql = """DELETE FROM %s WHERE uuid_id IN %%s LIMIT 10000""" % table_name
            for i in range(0, invalid_records_count, 10000):
                try:
                    with connection.cursor() as cursor:
                        cursor.execute(clean_sql, (invalid_uuids,))
                except Exception as e:
                    self.stderr.write('[%s] Failed to clean up invalid records of %s, error: %s.' %
                                      (datetime.now(), table_name, e))
                    return False

        self.stdout.write('[%s] Successfully cleaned up invalid records of %s.' %
                          (datetime.now(), table_name))
        return True

    def handle(self, *args, **kwargs):
        dry_run = kwargs['dry_run']
        # get all exist repo_id
        self.stdout.write('[%s] Count the number of exist repo.' % datetime.now())
        exist_repo_count = self.get_seafile_repo_count('Repo')
        if exist_repo_count is None:
            return
        self.stdout.write('[%s] The number of exist repo: %s.' % (datetime.now(), exist_repo_count))

        self.stdout.write('[%s] Start to query all exist repo_id.' % datetime.now())
        exist_repo_ids = self.query_seafile_repo_ids(exist_repo_count, 'Repo')
        if exist_repo_ids is None:
            return
        self.stdout.write('[%s] Successfully queried all exist repo_id, result length: %s.' %
                          (datetime.now(), len(exist_repo_ids)))

        # get all virtual repo_id
        self.stdout.write('[%s] Count the number of virtual repo.' % datetime.now())
        virtual_repo_count = self.get_seafile_repo_count('VirtualRepo')
        if virtual_repo_count is None:
            return
        self.stdout.write('[%s] The number of virtual repo: %s.' % (datetime.now(), virtual_repo_count))

        self.stdout.write('[%s] Start to query all virtual repo_id.' % datetime.now())
        virtual_repo_ids = self.query_seafile_repo_ids(virtual_repo_count, 'VirtualRepo')
        if virtual_repo_ids is None:
            return
        self.stdout.write('[%s] Successfully queried all virtual repo_id, result length: %s.' %
                          (datetime.now(), len(virtual_repo_ids)))

        # get all trash repo_id
        self.stdout.write('[%s] Count the number of trash repo.' % datetime.now())
        trash_repo_count = self.get_seafile_repo_count('RepoTrash')
        if trash_repo_count is None:
            return
        self.stdout.write('[%s] The number of trash repo: %s.' % (datetime.now(), trash_repo_count))

        self.stdout.write('[%s] Start to query all trash repo_id.' % datetime.now())
        trash_repo_ids = self.query_seafile_repo_ids(trash_repo_count, 'RepoTrash')
        if trash_repo_ids is None:
            return
        self.stdout.write('[%s] Successfully queried all trash repo_id, result length: %s.' %
                          (datetime.now(), len(trash_repo_ids)))

        all_repo_ids = exist_repo_ids | virtual_repo_ids | trash_repo_ids
        self.stdout.write('[%s] The number of valid repo: %s.' % (datetime.now(), len(all_repo_ids)))

        # clean up expired upload_link
        self.stdout.write('[%s] Start to clean up expired upload_link...' % datetime.now())
        if dry_run == 'false':
            sql1 = """DELETE FROM share_uploadlinkshare WHERE expire_date < DATE_SUB(CURDATE(), INTERVAL 7 DAY)"""
            try:
                with connection.cursor() as cursor:
                    cursor.execute(sql1)
            except Exception as e:
                self.stderr.write('[%s] Failed to clean up expired upload_link, error: %s.' % (datetime.now(), e))
                return
        self.stdout.write('[%s] Successfully cleaned up expired upload_link.' % datetime.now())

        # clean up invalid data
        self.stdout.write('[%s] Start to clean up invalid repo data...' % datetime.now())

        table_name_list = ['share_uploadlinkshare', 'revision_tag_revisiontags', 'base_userstarredfiles',
                           'share_extragroupssharepermission', 'share_extrasharepermission']
        for table_name in table_name_list:
            repo_id_count = self.get_repo_id_count(table_name)
            if repo_id_count is None:
                return

            invalid_repo_ids = self.query_invalid_repo_ids(all_repo_ids, repo_id_count, table_name)
            if invalid_repo_ids is None:
                return

            clean_up_success = self.clean_up_invalid_records(dry_run, invalid_repo_ids, table_name)
            if clean_up_success is False:
                return

        self.stdout.write('[%s] Start to clean up tables associated with the tags_fileuuidmap...' % datetime.now())
        repo_id_count = self.get_repo_id_count('tags_fileuuidmap')
        if repo_id_count is None:
            return

        invalid_repo_ids = self.query_invalid_repo_ids(all_repo_ids, repo_id_count, 'tags_fileuuidmap')
        if invalid_repo_ids is None:
            return

        invalid_uuid_count = 0
        if invalid_repo_ids:
            self.stdout.write('[%s] Count the number of invalid uuid of tags_fileuuidmap.' % datetime.now())
            count_sql = """SELECT COUNT(DISTINCT(`uuid`)) FROM tags_fileuuidmap WHERE repo_id IN %s"""
            try:
                with connection.cursor() as cursor:
                    cursor.execute(count_sql, (invalid_repo_ids,))
                    invalid_uuid_count = int(cursor.fetchone()[0])
            except Exception as e:
                self.stderr.write('[%s] Failed to count the number of invalid uuid of tags_fileuuidmap, error: %s.' %
                                  (datetime.now(), e))
                return
            self.stdout.write('[%s] The number of invalid uuid of tags_fileuuidmap: %s.' %
                              (datetime.now(), invalid_uuid_count))

        self.stdout.write('[%s] Start to query invalid uuid of tags_fileuuidmap.' % datetime.now())
        invalid_uuids = list()
        for i in range(0, invalid_uuid_count, 1000):
            sql = """SELECT DISTINCT(`uuid`) FROM tags_fileuuidmap WHERE repo_id IN %s LIMIT %s, %s"""
            try:
                with connection.cursor() as cursor:
                    cursor.execute(sql, (invalid_repo_ids, i, 1000))
                    res = cursor.fetchall()
            except Exception as e:
                self.stderr.write('[%s] Failed to query invalid uuid of tags_fileuuidmap, error: %s.' %
                                  (datetime.now(), e))
                return

            for uuid, *_ in res:
                invalid_uuids.append(uuid)

        self.stdout.write('[%s] Successfully queried invalid uuid of tags_fileuuidmap, result length: %s.' %
                          (datetime.now(), len(invalid_uuids)))

        tb_name_list = ['base_filecomment', 'file_participants_fileparticipant', 'file_tags_filetags', 'tags_filetag']
        for table_name in tb_name_list:
            clean_up_success = self.clean_up_invalid_uuid_records(dry_run, invalid_uuids, table_name)
            if clean_up_success is False:
                return

        # truncate related_files_relatedfiles
        self.stdout.write('[%s] Start to truncate table related_files_relatedfiles.' % datetime.now())
        if dry_run == 'false':
            truncate_sql = """TRUNCATE TABLE related_files_relatedfiles"""
            try:
                with connection.cursor() as cursor:
                    cursor.execute(truncate_sql)
            except Exception as e:
                self.stderr.write('[%s] Failed to truncate table related_files_relatedfiles, error: %s.' %
                                  (datetime.now(), e))
                return
        self.stdout.write('[%s] Successfully truncated table related_files_relatedfiles.' % datetime.now())

        self.stdout.write('[%s] Successfully cleaned up tables associated with the tags_fileuuidmap.' %
                          datetime.now())

        clean_up_success = self.clean_up_invalid_records(dry_run, invalid_repo_ids, 'tags_fileuuidmap')
        if clean_up_success is False:
            return
        self.stdout.write('[%s] Successfully cleaned up all invalid repo data.' % datetime.now())

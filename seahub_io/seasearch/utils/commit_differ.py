# coding: UTF-8
from seahub_io.seasearch.utils.constants import ZERO_OBJ_ID

from seafobj import fs_mgr


class CommitDiffer(object):
    def __init__(self, repo_id, version, root1, root2):
        self.repo_id = repo_id
        self.version = version
        self.root1 = root1
        self.root2 = root2

    def diff(self, root2_time): # noqa: C901
        added_files = []
        deleted_files = []
        deleted_dirs = []
        modified_files = []
        added_dirs = []

        new_dirs = [] # (path, dir_id)
        queued_dirs = [] # (path, dir_id1, dir_id2)

        if ZERO_OBJ_ID == self.root1:
            self.root1 = None
        if ZERO_OBJ_ID == self.root2:
            self.root2 = None

        if self.root1 == self.root2:
            return (added_files, deleted_files, added_dirs, deleted_dirs,
                    modified_files)
        elif not self.root1:
            new_dirs.append(('/', self.root2, root2_time, None))
        elif not self.root2:
            deleted_dirs.append('/')
        else:
            queued_dirs.append(('/', self.root1, self.root2))

        while True:
            path = old_id = new_id = None
            try:
                path, old_id, new_id = queued_dirs.pop(0)
            except IndexError:
                break

            dir1 = fs_mgr.load_seafdir(self.repo_id, self.version, old_id)
            dir2 = fs_mgr.load_seafdir(self.repo_id, self.version, new_id)

            for dent in dir1.get_files_list():
                new_dent = dir2.lookup_dent(dent.name)
                if not new_dent or new_dent.type != dent.type:
                    deleted_files.append((make_path(path, dent.name), ))
                else:
                    dir2.remove_entry(dent.name)
                    if new_dent.id == dent.id:
                        pass
                    else:
                        modified_files.append((make_path(path, dent.name), new_dent.id, new_dent.mtime, new_dent.size))

            added_files.extend([(make_path(path, dent.name), dent.id, dent.mtime, dent.size) for dent in dir2.get_files_list()])

            for dent in dir1.get_subdirs_list():
                new_dent = dir2.lookup_dent(dent.name)
                if not new_dent or new_dent.type != dent.type:
                    deleted_dirs.append(make_path(path, dent.name))
                else:
                    dir2.remove_entry(dent.name)
                    if new_dent.id == dent.id:
                        pass
                    else:
                        queued_dirs.append((make_path(path, dent.name), dent.id, new_dent.id))

            new_dirs.extend([(make_path(path, dent.name), dent.id, dent.mtime, dent.size) for dent in dir2.get_subdirs_list()])

        while True:
            # Process newly added dirs and its sub-dirs, all files under
            # these dirs should be marked as added.
            path = obj_id = None
            try:
                path, obj_id, mtime, size = new_dirs.pop(0)
                added_dirs.append((path, obj_id, mtime, size))
            except IndexError:
                break
            d = fs_mgr.load_seafdir(self.repo_id, self.version, obj_id)
            added_files.extend([(make_path(path, dent.name), dent.id, dent.mtime, dent.size) for dent in d.get_files_list()])

            new_dirs.extend([(make_path(path, dent.name), dent.id, dent.mtime, dent.size) for dent in d.get_subdirs_list()])

        return (added_files, deleted_files, added_dirs, deleted_dirs,
                modified_files)


def search_entry(entries, entryname):
    for name, obj_id in entries:
        if name == entryname:
            entries.remove((name, obj_id))
            return (name, obj_id)
    return (None, None)


def make_path(dirname, filename):
    if dirname == '/':
        return dirname + filename
    else:
        return '/'.join((dirname, filename))

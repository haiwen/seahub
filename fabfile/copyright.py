# Copyright (c) 2012-2016 Seafile Ltd.

import os
from fabric.api import task

@task
def update(path):
    """Add copyright stuff to the begining of files.
    """
    for filename in path_to_pyfile_list(path):
        do_update(filename)

@task
def check(path):
    """Check copyright stuff for files.
    """
    for filename in path_to_pyfile_list(path):
        do_check(filename)

def do_update(filename):
    if 'migrations' in filename:
        print('skip migration file: %s' % filename)
        return

    with open(filename) as f:
        # try read first line of file
        try:
            head = [next(f) for x in range(1)]
        except StopIteration:
            print('%s is empty, skip' % filename)
            return

    copy_str = '# Copyright (c) 2012-2016 Seafile Ltd.'

    need_update = True
    for line in head:
        line = line.lower()
        if 'seafile ltd.' in line:
            need_update = False

    if not need_update:
        print('%s is ok.' % filename)
        return

    line_prepender(filename, copy_str)
    print('%s Done.' % filename)

def path_to_pyfile_list(path):
    is_dir = False
    if os.path.isdir(path):
        is_dir = True

    if not is_dir:
        py_files = [path]
    else:
        py_files = []
        for root, directories, filenames in os.walk(path):
            for directory in directories:
                f = os.path.join(root, directory)
                if f.endswith('.py'):
                    py_files.append(f)
            for filename in filenames:
                if filename.endswith('.py'):
                    py_files.append(os.path.join(root, filename))
    return py_files


def line_prepender(filename, line):
    with open(filename, 'r+') as f:
        content = f.read()
        f.seek(0, 0)
        f.write(line.rstrip('\r\n') + '\n' + content)

def do_check(filename):
    if 'migrations' in filename:
        return

    with open(filename) as f:
        # try read first line of file
        try:
            head = [next(f) for x in range(1)]
        except StopIteration:
            return

    need_update = True
    for line in head:
        line = line.lower()
        if 'seafile ltd.' in line:
            need_update = False

    if need_update:
        print('No copyright info in %s.' % filename)

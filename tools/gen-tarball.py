#!/usr/bin/env python
# coding: UTF-8
# Copyright (c) 2012-2016 Seafile Ltd.

import sys
import os
import tempfile
import shutil
import subprocess
import subprocess
import atexit
import optparse

cwd = os.getcwd()

####################
### Common helper functions
####################
def highlight(content, is_error=False):
    '''Add ANSI color to content to get it highlighted on terminal'''
    if is_error:
        return '\x1b[1;31m%s\x1b[m' % content
    else:
        return '\x1b[1;32m%s\x1b[m' % content

def info(msg):
    print(highlight('[INFO] ') + msg)

def exist_in_path(prog):
    '''Test whether prog exists in system path'''
    dirs = os.environ['PATH'].split(':')
    for d in dirs:
        if d == '':
            continue
        path = os.path.join(d, prog)
        if os.path.exists(path):
            return True

    return False

def error(msg=None, usage=None):
    if msg:
        print(highlight('[ERROR] ') + msg)
    if usage:
        print(usage)
    sys.exit(1)

def run(cmdline, cwd=None, env=None, suppress_stdout=False, suppress_stderr=False):
    '''Like run_argv but specify a command line string instead of argv'''
    info('running: %s' % cmdline)
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

def must_mkdir(path):
    '''Create a directory, exit on failure'''
    try:
        os.mkdir(path)
    except OSError:
        error('failed to create directory %s' % path)

def must_copy(src, dst):
    '''Copy src to dst, exit on failure'''
    try:
        shutil.copy(src, dst)
    except Exception as e:
        error('failed to copy %s to %s: %s' % (src, dst, e))

def must_move(src, dst):
    '''Copy src to dst, exit on failure'''
    try:
        shutil.move(src, dst)
    except Exception as e:
        error('failed to move %s to %s: %s' % (src, dst, e))

usage = '''\
Usage: gen-tarball.py <version>

    version must be a local branch name and must be like "1.3" or "1.3.0".
'''

def parse_args():
    parser = optparse.OptionParser()
    parser.add_option('--version',
                      dest='version',
                      nargs=1,
                      help='version of the tarball')

    parser.add_option('--branch',
                      dest='branch',
                      nargs=1,
                      help='which branch to generate the tarball')

    usage = parser.format_help()
    options, remain = parser.parse_args()
    if remain or options.version == None or options.branch == None:
        print(usage)
        sys.exit(1)

    return options.version, options.branch


def main():
    parse_args()
    version, branch = parse_args()

    if not exist_in_path('django-admin') and not exist_in_path('django-admin.py'):
        error('django-admin scripts not found in PATH')

    # Note: we double % to escape it in a format string
    latest_commit_info = subprocess.getoutput('git log --format="%%H" %s -1' % branch)

    # begin
    tmpdir = tempfile.mkdtemp()
    info('tmpdir is %s' % tmpdir)
    def remove_tmpdir():
        try:
            shutil.rmtree(tmpdir)
        except:
            pass

    atexit.register(remove_tmpdir)
    os.chdir(tmpdir)

    tarball_name = 'seahub-%s.tar.gz' % version
    tmp_tarball = os.path.join(tmpdir, tarball_name)

    cmd = 'git archive --prefix=seahub-%(version)s/ -o %(tarball)s %(branch)s' \
          % dict(version=version, tarball=tmp_tarball, branch=branch)

    if run(cmd, cwd=cwd) != 0:
        error('failed to "git archive"')

    # uncompress the tarball
    if run('tar xf %s' % tmp_tarball) != 0:
        error('failed to uncompress the tarball')

    seahub_dir = os.path.join(tmpdir, 'seahub-%s' % version)
    if run('./i18n.sh compile-all', cwd=seahub_dir) != 0:
        error('failed to compile messages')

    with open(os.path.join(seahub_dir, 'latest_commit'), 'w') as fp:
        fp.write(latest_commit_info)
        fp.write('\n')

    if run('tar czvf %s seahub-%s' % (tarball_name, version)) != 0:
        error('failed to generate tarball')

    dst_tarball = os.path.join(cwd, tarball_name)
    must_move(tmp_tarball, dst_tarball)

    info('output is:\t%s' % dst_tarball)

if __name__ == '__main__':
    main()

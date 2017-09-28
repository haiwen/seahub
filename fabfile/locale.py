# Copyright (c) 2012-2016 Seafile Ltd.
"""
Tools for i18n.
"""
from fabric.api import local, task
from fabric.colors import red, green

@task
def make(default=True, lang='en'):
    """Update source language.
    """
    local('django-admin.py makemessages -l %s -e py,html -i "thirdpart*" -i "docs*"' % lang)

    # some version of makemessages will produce "%%" in the string, replace that
    # to "%".
    _inplace_change('locale/%s/LC_MESSAGES/django.po' % lang, '%%s', '%s')
    _inplace_change('locale/%s/LC_MESSAGES/django.po' % lang, '%%(', '%(')

    local('django-admin.py makemessages -l %s -d djangojs  -i "thirdpart" -i "node_modules" -i "media" -i "static/scripts/dist" -i "static/scripts/lib" -i "tests" -i "tools" -i "tagging" -i "static/scripts/i18n" --verbosity 2' % lang)

@task
def push():
    """Push source file to Transifex.
    """
    local('tx push -s')

@task
def pull():
    """Update local po files with Transifex.
    """
    local('tx pull')

@task()
def compile():
    """Compile po files.
    """
    local('django-admin.py compilemessages && pushd seahub/two_factor && django-admin.py compilemessages && popd && pushd seahub/trusted_ip && django-admin.py compilemessages')

########## utility functions
def _inplace_change(filename, old_string, new_string):
    s = open(filename).read()
    if old_string in s:
        print(green('Changing "{old_string}" to "{new_string}" in "{filename}"'.format(**locals())))
        s = s.replace(old_string, new_string)
        f = open(filename, 'w')
        f.write(s)
        f.flush()
        f.close()

def _debug(msg):
    print(red('Running: {msg}'.format(**locals())))

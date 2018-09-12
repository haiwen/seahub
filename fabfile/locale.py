# Copyright (c) 2012-2016 Seafile Ltd.
"""
Tools for i18n.
"""
import os
from fabric.api import local, task
from fabric.colors import red, green

@task
def make(default=True, lang='en'):
    """Update source language.
    """
    # check branch name
    with open('.git/HEAD') as f:
        b1 = f.readline()

    with open('../seahub-extra/.git/HEAD') as f:
        b2 = f.readline()

    if b1 != b2:
        print 'Error: inconsistent Git branch names.'
        return


    # add strings in 'organization'
    os.symlink('../../seahub-extra/seahub_extra/organizations', 'seahub/organizations')

    local('django-admin.py makemessages -s -l %s -e py,html -i "thirdpart*" -i "docs*" -i "seahub/two_factor/gateways" -i "seahub/two_factor/templates/two_factor/core/otp_required.html" -i "seahub/two_factor/templates/two_factor/core/phone_register.html" -i "seahub/two_factor/templates/two_factor/profile/profile.html" -i "seahub/two_factor/models/phone.py" -i "seahub/two_factor/models/base.py" -i "seahub/two_factor/templates/two_factor/core/setup_complete.html"' % lang)

    # remove 'organization' symlink to make codebase clean
    os.remove('seahub/organizations')

    # some version of makemessages will produce "%%" in the string, replace that
    # to "%".
    _inplace_change('locale/%s/LC_MESSAGES/django.po' % lang, '%%s', '%s')
    _inplace_change('locale/%s/LC_MESSAGES/django.po' % lang, '%%(', '%(')

    makejs(lang)

@task
def makejs(lang='en'):
    local('django-admin.py makemessages -l %s -d djangojs  -i "thirdpart" -i "node_modules" -i "media" -i "static/scripts/dist" -i "static/scripts/lib" -i "tests" -i "tools" -i "tagging" -i "static/scripts/i18n" -i "frontend/build" -i "frontend/config" -i "frontend/scripts" --verbosity 2' % lang)

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
    local('django-admin.py compilemessages && pushd seahub/trusted_ip && django-admin.py compilemessages')

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

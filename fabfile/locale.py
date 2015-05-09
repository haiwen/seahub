"""
Tools for i18n.
"""
from fabric.api import local, task
from fabric.colors import red, green

@task
def make(default=True):
    """Update source language.
    """
    local('django-admin.py makemessages -l en -e py,html -i "thirdpart*" -i "docs*"')

    # some version of makemessages will produce "%%" in the string, replace that
    # to "%".
    _inplace_change('locale/en/LC_MESSAGES/django.po', '%%s', '%s')
    _inplace_change('locale/en/LC_MESSAGES/django.po', '%%(', '%(')

    local('django-admin.py makemessages -l en -d djangojs  -i "thirdpart" -i "node_modules" -i "media" -i "static/scripts/dist" -i "static/scripts/lib" -i "tests" -i "tools" -i "tagging" -i "static/scripts/i18n" --verbosity 2')

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
    local('django-admin.py compilemessages')

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

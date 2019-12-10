import string
import random
import requests

from .common import BASE_URL

def randstring(length=0):
    if length == 0:
        length = random.randint(1, 30)
    return ''.join(random.choice(string.ascii_lowercase) for i in range(length))

def urljoin(base, *args):
    url = base
    if url[-1] != '/':
        url += '/'
    for arg in args:
        arg = arg.strip('/')
        url += arg + '/'
    return url

def apiurl(*parts):
    return urljoin(BASE_URL, *parts)

def upload_file_test(upload_link, parent_dir='/'):
    file_name = randstring(6)
    files = {
        'file': (file_name, 'Some lines in this file'),
        'parent_dir': parent_dir,
    }

    resp = requests.post(upload_link, files=files)
    assert 200 == resp.status_code

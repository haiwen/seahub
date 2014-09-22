import string
import random

from .common import BASE_URL

def randstring(length=0):
    if length == 0:
        length = random.randint(1, 30)
    return ''.join(random.choice(string.lowercase) for i in range(length))

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

# Copyright (c) 2012-2016 Seafile Ltd.
#coding: UTF-8

import platform
import os

def get_platform_name():
    '''Returns current platform the seafile server is running on. Possible return
    values are:

    - 'linux'
    - 'windows'
    - 'raspberry-pi'

    '''
    if os.name == 'nt':
        return 'windows'
    elif 'arm' in platform.machine():
        return 'raspberry-pi'
    else:
        return 'linux'

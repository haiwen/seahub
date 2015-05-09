import logging
logger = logging.getLogger(__name__)

def parse_license(file_path):
    """Parse license file and return dict.

    Arguments:
    - `file_path`:

    Returns:
    e.g.

    {'Hash': 'fdasfjl',
    'Name': 'seafile official',
    'Licencetype': 'User',
    'LicenceKEY': '123',
    'Expiration': '2016-3-2',
    'MaxUsers': '1000000',
    'ProductID': 'Seafile server for Windows'
    }

    """
    ret = {}
    lines = []
    try:
        with open(file_path) as f:
            lines = f.readlines()
    except Exception as e:
        logger.warn(e)
        return {}

    for line in lines:
        if len(line.split('=')) == 2:
            k, v = line.split('=')
            ret[k.strip()] = v.strip().strip('"')

    return ret

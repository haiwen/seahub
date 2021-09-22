import logging
import requests

from seahub.onlyoffice.converter_utils import get_file_name, get_file_ext
from seahub.onlyoffice.settings import ONLYOFFICE_CONVERTER_URL, \
        ONLYOFFICE_JWT_SECRET, ONLYOFFICE_JWT_HEADER

logger = logging.getLogger(__name__)


def get_converter_uri(doc_uri, from_ext, to_ext, doc_key, is_async, file_password=None):

    if not from_ext:
        from_ext = get_file_ext(doc_uri)

    title = get_file_name(doc_uri)

    payload = {
        'url': doc_uri,
        'outputtype': to_ext.replace('.', ''),
        'filetype': from_ext.replace('.', ''),
        'title': title,
        'key': doc_key,
    }

    if file_password:
        payload['password'] = file_password

    if is_async:
        payload.setdefault('async', True)

    headers = {'accept': 'application/json'}

    if ONLYOFFICE_JWT_SECRET:

        import jwt

        token = jwt.encode(payload, ONLYOFFICE_JWT_SECRET, algorithm='HS256')
        payload['token'] = token

        header_token = jwt.encode({'payload': payload}, ONLYOFFICE_JWT_SECRET, algorithm='HS256')
        headers[ONLYOFFICE_JWT_HEADER] = f'Bearer {header_token}'

    response = requests.post(ONLYOFFICE_CONVERTER_URL, json=payload, headers=headers)
    json = response.json()

    return get_response_uri(json)


def get_response_uri(json):
    is_end = json.get('endConvert')
    error = json.get('error')
    if error:
        process_error(error)

    if is_end:
        return json.get('fileUrl')


def process_error(error):
    prefix = 'Error occurred in the ConvertService: '

    mapping = {
        '-8': f'{prefix}Error document VKey',
        '-7': f'{prefix}Error document request',
        '-6': f'{prefix}Error database',
        '-5': f'{prefix}Incorrect password',
        '-4': f'{prefix}Error download error',
        '-3': f'{prefix}Error convertation error',
        '-2': f'{prefix}Error convertation timeout',
        '-1': f'{prefix}Error convertation unknown'
    }
    logger.error(f'[OnlyOffice] Converter URI Error Code: {error}')
    raise Exception(mapping.get(str(error), f'Error Code: {error}'))

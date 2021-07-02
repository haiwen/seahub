import logging
import requests

from seahub.onlyoffice.converterUtils import getFileName, getFileExt
from seahub.onlyoffice.settings import ONLYOFFICE_CONVERTER_URL, ONLYOFFICE_JWT_SECRET

logger = logging.getLogger(__name__)

def getConverterUri(docUri, fromExt, toExt, docKey, isAsync, filePass = None):
    if not fromExt:
        fromExt = getFileExt(docUri)

    title = getFileName(docUri)

    payload = {
        'url': docUri,
        'outputtype': toExt.replace('.', ''),
        'filetype': fromExt.replace('.', ''),
        'title': title,
        'key': docKey,
        'password': filePass
    }

    headers={'accept': 'application/json'}

    if isAsync:
        payload.setdefault('async', True)

    if ONLYOFFICE_JWT_SECRET:
        import jwt
        payload['token'] = jwt.encode({'payload': payload}, ONLYOFFICE_JWT_SECRET)

    response = requests.post(ONLYOFFICE_CONVERTER_URL, json=payload, headers=headers )
    json = response.json()

    return getResponseUri(json)

def getResponseUri(json):
    isEnd = json.get('endConvert')
    error = json.get('error')
    if error:
        processError(error)

    if isEnd:
        return json.get('fileUrl')

def processError(error):
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
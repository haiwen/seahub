import json
import requests
from seahub.onlyoffice.utils import getFileName, getFileExt
from seahub.onlyoffice.settings import DOC_SERV_SITE_URL, DOC_SERV_CONVERTER_URL

# convert file and give url to a new file
# TODO: Add JWT checks
def getConverterUri(docUri, fromExt, toExt, docKey, isAsync, filePass = None):
    if not fromExt: # check if the extension from the request matches the real file extension
        fromExt = getFileExt(docUri) # if not, overwrite the extension value

    title = getFileName(docUri)

    payload = { # write all the necessary data to the payload object
        'url': docUri,
        'outputtype': toExt.replace('.', ''),
        'filetype': fromExt.replace('.', ''),
        'title': title,
        'key': docKey,
        'password': filePass
    }

    headers={'accept': 'application/json'}

    if (isAsync):
        payload.setdefault('async', True)

    response = requests.post(DOC_SERV_SITE_URL + DOC_SERV_CONVERTER_URL, json=payload, headers=headers )
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

    raise Exception(mapping.get(str(error), f'Error Code: {error}')) 
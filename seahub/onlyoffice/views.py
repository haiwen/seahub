# Copyright (c) 2012-2017 Seafile Ltd.
import json
import logging
import os
import requests

from django.core.cache import cache
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from seaserv import seafile_api

from seahub.onlyoffice.settings import VERIFY_ONLYOFFICE_CERTIFICATE
from seahub.utils import gen_inner_file_upload_url

# Get an instance of a logger
logger = logging.getLogger(__name__)

@csrf_exempt
def onlyoffice_editor_callback(request):
    """ Callback func of OnlyOffice.

    The document editing service informs the document storage service about status of the document editing using the callbackUrl from JavaScript API. The document editing service use the POST request with the information in body.

    https://api.onlyoffice.com/editors/callback
    """

    if request.method != 'POST':
        logger.error('Request method if not POST.')
        # The document storage service must return the following response.
        # otherwise the document editor will display an error message.
        return HttpResponse('{"error": 0}')

    #### body info of POST rquest when open file on browser
    # {u'actions': [{u'type': 1, u'userid': u'uid-1527736776860'}],
    #  u'key': u'8062bdccf9b4cf809ae3',
    #  u'status': 1,
    #  u'users': [u'uid-1527736776860']}

    #### body info of POST rquest when close file's web page (save file)
    # {u'actions': [{u'type': 0, u'userid': u'uid-1527736951523'}],
    # u'changesurl': u'...',
    # u'history': {u'changes': [{u'created': u'2018-05-31 03:17:17',
    #                            u'user': {u'id': u'uid-1527736577058',
    #                                      u'name': u'lian'}},
    #                           {u'created': u'2018-05-31 03:23:55',
    #                            u'user': {u'id': u'uid-1527736951523',
    #                                      u'name': u'lian'}}],
    #              u'serverVersion': u'5.1.4'},
    # u'key': u'61484dec693009f3d506',
    # u'lastsave': u'2018-05-31T03:23:55.767Z',
    # u'notmodified': False,
    # u'status': 2,
    # u'url': u'...',
    # u'users': [u'uid-1527736951523']}

    # Defines the status of the document. Can have the following values:
    # 0 - no document with the key identifier could be found,
    # 1 - document is being edited,
    # 2 - document is ready for saving,
    # 3 - document saving error has occurred,
    # 4 - document is closed with no changes,
    # 6 - document is being edited, but the current document state is saved,
    # 7 - error has occurred while force saving the document.

    # Status 1 is received every user connection to or disconnection from document co-editing.
    #
    # Status 2 (3) is received 10 seconds after the document is closed for editing with the identifier of the user who was the last to send the changes to the document editing service.
    #
    # Status 4 is received after the document is closed for editing with no changes by the last user.
    #
    # Status 6 (7) is received when the force saving request is performed.

    post_data = json.loads(request.body)
    status = int(post_data.get('status', -1))

    if status in (2, 6):
        # Defines the link to the edited document to be saved with the document storage service.
        # The link is present when the status value is equal to 2 or 3 only.
        url = post_data.get('url')
        resp = requests.get(url, verify=VERIFY_ONLYOFFICE_CERTIFICATE)
        if not resp:
            logger.error('[OnlyOffice] No response from file content url.')
            return HttpResponse('{"error": 0}')

        # get file basic info
        doc_key = post_data.get('key')
        doc_info = json.loads(cache.get("ONLYOFFICE_%s" % doc_key))

        repo_id = doc_info['repo_id']
        file_path = doc_info['file_path']
        username = doc_info['username']

        fake_obj_id = {'online_office_update': True,}
        update_token = seafile_api.get_fileserver_access_token(repo_id,
                json.dumps(fake_obj_id), 'update', username)

        if not update_token:
            logger.error('[OnlyOffice] No fileserver access token.')
            return HttpResponse('{"error": 0}')

        # get file content
        files = {
            'file': requests.get(url).content,
            'file_name': os.path.basename(file_path),
            'target_file': file_path,
        }

        # update file
        update_url = gen_inner_file_upload_url('update-api', update_token)
        requests.post(update_url, files=files)

    return HttpResponse('{"error": 0}')

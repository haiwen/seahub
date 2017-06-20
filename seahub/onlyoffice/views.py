# Copyright (c) 2012-2017 Seafile Ltd.
import json
import logging
import os
import requests
import urllib2

from django.core.cache import cache
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from seaserv import seafile_api

from .settings import VERIFY_ONLYOFFICE_CERTIFICATE
from seahub.utils import gen_file_upload_url

# Get an instance of a logger
logger = logging.getLogger(__name__)

@csrf_exempt
def onlyoffice_editor_callback(request):
    #request.body:
    # {"key":"Khirz6zTPdfd7","status":1,
    # "users":["uid-1488351242769"],
    # "actions":[{"type":1,"userid":"uid-1488351242769"}]}

    # "key":"Khirz6zTPdfd8","status":2,"url":"https://13.113.111.2/cache/files/Khirz6zTPdfd8_6379/output.docx/output.docx?md5=5oL0qGUqXw72D85f28JaFg==&expires=1488956681&disposition=attachment&ooname=output.docx","changesurl":"https://13.113.111.2/cache/files/Khirz6zTPdfd8_6379/changes.zip/changes.zip?md5=vx3VYwaPEOxtZDA_3yuVrg==&expires=1488956681&disposition=attachment&ooname=output.zip","history":{"serverVersion":"4.2.10","changes":[{"created":"2017-03-01 07:03:11","user":{"id":"uid-1488351774447","name":"Anonymous"}}]},"users":["uid-1488351774447"],"actions":[{"type":0,"userid":"uid-1488351774447"}]}
    logger.debug(request.body)

    if request.method != 'POST':
        return HttpResponse('{"error": 0}')

    post_data = json.loads(request.body)
    status = int(post_data.get('status', -1))
    if status == 2:             # document is ready for saving
        # the link to the edited document to be saved with the document storage
        # service. The link is present when the status value is equal to 2 or 3 only.
        url = post_data.get('url')

        context = None
        if VERIFY_ONLYOFFICE_CERTIFICATE is False:
            import ssl
            context = ssl._create_unverified_context()

        try:
            file_content = urllib2.urlopen(url, context=context).read()
        except urllib2.URLError as e:
            logger.error(e)
        else:
            # update file
            doc_key = post_data.get('key')
            doc_info = json.loads(cache.get("ONLYOFFICE_%s" % doc_key))
            repo_id = doc_info['repo_id']
            file_path = doc_info['file_path']
            username = doc_info['username']

            update_token = seafile_api.get_fileserver_access_token(repo_id,
                    'dummy', 'update', username)

            if not update_token:
                return HttpResponse('{"error": 0}')

            update_url = gen_file_upload_url(update_token, 'update-api')

            files = {
                'file': file_content,
                'file_name': os.path.basename(file_path),
                'target_file': file_path,
            }
            requests.post(update_url, files=files)
            logger.info('%s updated by %s' % (repo_id + file_path, username))

    return HttpResponse('{"error": 0}')

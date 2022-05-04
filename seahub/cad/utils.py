import logging
from requests.models import PreparedRequest
from django.urls import reverse
from seahub.cad.settings import CAD_MOBILE_SIZE_LIMIT, CAD_PC_SIZE_LIMIT, \
        CAD_HOST

# Get an instance of a logger
logger = logging.getLogger(__name__)


def get_cad_dict(request, username, repo_id, file_path):

    return_dict = {}
    return_dict['cad_mobile_size_limit'] = CAD_MOBILE_SIZE_LIMIT
    return_dict['cad_pc_size_limit'] = CAD_PC_SIZE_LIMIT

    req = PreparedRequest()
    param_dict = {'repo_id': repo_id, 'file_path': file_path}
    req.prepare_url(CAD_HOST + reverse('CadApiFileContentView'), param_dict)
    return_dict['doc_url'] = req.url

    return return_dict

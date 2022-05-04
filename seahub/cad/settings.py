from django.conf import settings


ENABLE_CAD = getattr(settings, 'ENABLE_CAD', False)
CAD_MOBILE_SIZE_LIMIT = getattr(settings, 'CAD_MOBILE_SIZE_LIMIT', 5242880)
CAD_PC_SIZE_LIMIT = getattr(settings, 'CAD_PC_SIZE_LIMIT', 12582912)
CAD_HOST = getattr(settings, 'CAD_HOST', 'http://127.0.0.1:8000')

WEBCAD_ROOT_FOLDER = getattr(settings, 'WEBCAD_ROOT_FOLDER', '')
WEBCAD_DWG_PATH = getattr(settings, 'WEBCAD_DWG_PATH', 'file/dwg')
WEBCAD_OCF_PATH = getattr(settings, 'WEBCAD_OCF_PATH', 'file/ocf')

WEBCAD_HOST = getattr(settings, 'WEBCAD_HOST', '127.0.0.1')
WEBCAD_PORT = getattr(settings, 'WEBCAD_PORT', 3181)

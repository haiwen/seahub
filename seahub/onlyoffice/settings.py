# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings

ENABLE_ONLYOFFICE = getattr(settings, 'ENABLE_ONLYOFFICE', False)
ONLYOFFICE_APIJS_URL = getattr(settings, 'ONLYOFFICE_APIJS_URL', '')
ONLYOFFICE_FILE_EXTENSION = getattr(settings, 'ONLYOFFICE_FILE_EXTENSION', ())
ONLYOFFICE_EDIT_FILE_EXTENSION = getattr(settings, 'ONLYOFFICE_EDIT_FILE_EXTENSION', ())
VERIFY_ONLYOFFICE_CERTIFICATE = getattr(settings, 'VERIFY_ONLYOFFICE_CERTIFICATE', True)

# if True, file will be saved when user click save btn on file editing page
ONLYOFFICE_FORCE_SAVE = getattr(settings, 'ONLYOFFICE_FORCE_SAVE', True)

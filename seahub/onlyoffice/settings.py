# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings

ENABLE_ONLYOFFICE = getattr(settings, 'ENABLE_ONLYOFFICE', False)
ONLYOFFICE_APIJS_URL = getattr(settings, 'ONLYOFFICE_APIJS_URL', '')
ONLYOFFICE_FILE_EXTENSION = getattr(settings, 'ONLYOFFICE_FILE_EXTENSION', ())
ONLYOFFICE_EDIT_FILE_EXTENSION = getattr(settings, 'ONLYOFFICE_EDIT_FILE_EXTENSION', ())
VERIFY_ONLYOFFICE_CERTIFICATE = getattr(settings, 'VERIFY_ONLYOFFICE_CERTIFICATE', True)
ONLYOFFICE_JWT_SECRET = getattr(settings, 'ONLYOFFICE_JWT_SECRET', '')
# if True, file will be saved when user click save btn on file editing page
ONLYOFFICE_FORCE_SAVE = getattr(settings, 'ONLYOFFICE_FORCE_SAVE', False)
ONLYOFFICE_DESKTOP_EDITORS_PORTAL_LOGIN = getattr(settings, 'ONLYOFFICE_DESKTOP_EDITORS_PORTAL_LOGIN', False)

# ONLYOFFICE Document Server root
DOC_SERV_SITE_URL = 'http://172.17.0.1:9090/'
DOC_SERV_CONVERTER_URL = 'ConvertService.ashx' 

ONLYOFFICE_CONVERTER_EXTENSIONS = [
    ".docm", ".doc", ".dotx", ".dotm", ".dot", ".odt",
    ".fodt", ".ott", ".xlsm", ".xls", ".xltx", ".xltm",
    ".xlt", ".ods", ".fods", ".ots", ".pptm", ".ppt",
    ".ppsx", ".ppsm", ".pps", ".potx", ".potm", ".pot",
    ".odp", ".fodp", ".otp", ".rtf", ".mht", ".html", ".htm", ".xml", ".epub", ".fb2"
]

EXT_SPREADSHEET = [
    ".xls", ".xlsx", ".xlsm",
    ".xlt", ".xltx", ".xltm",
    ".ods", ".fods", ".ots", ".csv"
]

EXT_PRESENTATION = [
    ".pps", ".ppsx", ".ppsm",
    ".ppt", ".pptx", ".pptm",
    ".pot", ".potx", ".potm",
    ".odp", ".fodp", ".otp"
]

EXT_DOCUMENT = [
    ".doc", ".docx", ".docm",
    ".dot", ".dotx", ".dotm",
    ".odt", ".fodt", ".ott", ".rtf", ".txt",
    ".html", ".htm", ".mht", ".xml",
    ".pdf", ".djvu", ".fb2", ".epub", ".xps"
]
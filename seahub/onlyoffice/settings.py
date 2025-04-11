# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from seahub.settings import ENABLE_MULTIPLE_OFFICE_SUITE, OFFICE_SUITE_LIST, OFFICE_SUITE_ENABLED_FILE_TYPES, OFFICE_SUITE_ENABLED_EDIT_FILE_TYPES

ENABLE_ONLYOFFICE = getattr(settings, 'ENABLE_ONLYOFFICE', False)
ONLYOFFICE_APIJS_URL = getattr(settings, 'ONLYOFFICE_APIJS_URL', '')
ONLYOFFICE_CONVERTER_URL = ONLYOFFICE_APIJS_URL.replace("/web-apps/apps/api/documents/api.js",
                                                        "/ConvertService.ashx")
ONLYOFFICE_FILE_EXTENSION = getattr(settings, 'ONLYOFFICE_FILE_EXTENSION', ())
ONLYOFFICE_FILE_EXTENSION = ONLYOFFICE_FILE_EXTENSION + ('csv',)
ONLYOFFICE_EDIT_FILE_EXTENSION = getattr(settings, 'ONLYOFFICE_EDIT_FILE_EXTENSION', ())
ONLYOFFICE_EDIT_FILE_EXTENSION = ONLYOFFICE_EDIT_FILE_EXTENSION + ('csv',)
VERIFY_ONLYOFFICE_CERTIFICATE = getattr(settings, 'VERIFY_ONLYOFFICE_CERTIFICATE', True)
ONLYOFFICE_JWT_HEADER = getattr(settings, 'ONLYOFFICE_JWT_HEADER', 'Authorization')
ONLYOFFICE_JWT_SECRET = getattr(settings, 'ONLYOFFICE_JWT_SECRET', '')
# if True, file will be saved when user click save btn on file editing page
ONLYOFFICE_FORCE_SAVE = getattr(settings, 'ONLYOFFICE_FORCE_SAVE', False)
ONLYOFFICE_DESKTOP_EDITOR_HTTP_USER_AGENT = getattr(settings,
                                                    'ONLYOFFICE_DESKTOP_EDITOR_HTTP_USER_AGENT',
                                                    'AscDesktopEditor')

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


if ENABLE_MULTIPLE_OFFICE_SUITE:
    OFFICE_SUITE_ONLY_OFFICE = 'onlyoffice'
    office_info = {}
    for s in OFFICE_SUITE_LIST:
        if s.get('id') == OFFICE_SUITE_ONLY_OFFICE:
            office_info = s
            break
    ONLYOFFICE_APIJS_URL = office_info.get('ONLYOFFICE_APIJS_URL')
    ONLYOFFICE_CONVERTER_URL = ONLYOFFICE_APIJS_URL and ONLYOFFICE_APIJS_URL.replace("/web-apps/apps/api/documents/api.js", "/ConvertService.ashx")
    ONLYOFFICE_FORCE_SAVE = office_info.get('ONLYOFFICE_FORCE_SAVE', False)
    ONLYOFFICE_JWT_SECRET = office_info.get('ONLYOFFICE_JWT_SECRET', '')
    ONLYOFFICE_JWT_HEADER = office_info.get('ONLYOFFICE_JWT_HEADER', 'Authorization')
    ONLYOFFICE_DESKTOP_EDITOR_HTTP_USER_AGENT = office_info.get('ONLYOFFICE_DESKTOP_EDITOR_HTTP_USER_AGENT', 'AscDesktopEditor')
    VERIFY_ONLYOFFICE_CERTIFICATE = office_info.get('VERIFY_ONLYOFFICE_CERTIFICATE', True)
    ONLYOFFICE_FILE_EXTENSION = OFFICE_SUITE_ENABLED_FILE_TYPES
    ONLYOFFICE_EDIT_FILE_EXTENSION = OFFICE_SUITE_ENABLED_EDIT_FILE_TYPES

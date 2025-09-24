# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from seahub.settings import ENABLE_MULTIPLE_OFFICE_SUITE, \
        OFFICE_SUITE_LIST, OFFICE_SUITE_ENABLED_FILE_TYPES, \
        OFFICE_SUITE_ENABLED_EDIT_FILE_TYPES

ENABLE_ONLYOFFICE = getattr(settings, 'ENABLE_ONLYOFFICE', False)
ONLYOFFICE_APIJS_URL = getattr(settings, 'ONLYOFFICE_APIJS_URL', '')
ONLYOFFICE_CONVERTER_URL = ONLYOFFICE_APIJS_URL.replace("/web-apps/apps/api/documents/api.js",
                                                        "/ConvertService.ashx")

ONLYOFFICE_EXT_WORD = getattr(settings,
                              'ONLYOFFICE_EXT_WORD',
                              ["doc", "docm", "docx", "docxf", "dot",
                               "dotm", "dotx", "epub", "fb2",
                               "fodt", "htm", "html", "md",
                               "hwp", "hwpx", "mht", "mhtml",
                               "odt", "ott", "pages", "rtf",
                               "stw", "sxw", "txt", "wps", "wpt", "xml"])
ONLYOFFICE_EXT_CELL = getattr(settings,
                              'ONLYOFFICE_EXT_CELL',
                              ["csv", "et", "ett", "fods",
                               "numbers", "ods", "ots", "sxc",
                               "xls", "xlsb", "xlsm", "xlsx",
                               "xlt", "xltm", "xltx", "xml"])
ONLYOFFICE_EXT_SLIDE = getattr(settings,
                               'ONLYOFFICE_EXT_SLIDE',
                               ["dps", "dpt", "fodp", "key",
                                "odg", "odp", "otp", "pot",
                                "potm", "potx", "pps", "ppsm",
                                "ppsx", "ppt", "pptm", "pptx", "sxi"])
ONLYOFFICE_EXT_PDF = getattr(settings,
                             'ONLYOFFICE_EXT_PDF',
                             ["djvu", "oxps", "pdf", "xps"])

ONLYOFFICE_EXT_DIAGRAM = getattr(settings,
                                 'ONLYOFFICE_EXT_DIAGRAM',
                                 ["vsdm", "vsdx", "vssm", "vssx",
                                  "vstm", "vstx"])

ONLYOFFICE_FILE_EXTENSION = getattr(settings,
                                    'ONLYOFFICE_FILE_EXTENSION',
                                    ('doc', 'docx', 'ppt', 'pptx',
                                     'xls', 'xlsx', 'odt', 'fodt',
                                     'odp', 'fodp', 'ods', 'fods',
                                     'ppsx', 'pps', 'csv', 'pages'))
ONLYOFFICE_EDIT_FILE_EXTENSION = getattr(settings,
                                         'ONLYOFFICE_EDIT_FILE_EXTENSION',
                                         ('docx', 'pptx', 'xlsx', 'csv', 'pages'))

VERIFY_ONLYOFFICE_CERTIFICATE = getattr(settings, 'VERIFY_ONLYOFFICE_CERTIFICATE', True)
ONLYOFFICE_JWT_HEADER = getattr(settings, 'ONLYOFFICE_JWT_HEADER', 'Authorization')
ONLYOFFICE_JWT_SECRET = getattr(settings, 'ONLYOFFICE_JWT_SECRET', '')
# if True, file will be saved when user click save btn on file editing page
ONLYOFFICE_FORCE_SAVE = getattr(settings, 'ONLYOFFICE_FORCE_SAVE', False)
ONLYOFFICE_DESKTOP_EDITOR_HTTP_USER_AGENT = getattr(settings,
                                                    'ONLYOFFICE_DESKTOP_EDITOR_HTTP_USER_AGENT',
                                                    'AscDesktopEditor')

ONLYOFFICE_CONVERTER_EXTENSIONS = ONLYOFFICE_EXT_WORD + ONLYOFFICE_EXT_CELL + ONLYOFFICE_EXT_SLIDE + ONLYOFFICE_EXT_PDF


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

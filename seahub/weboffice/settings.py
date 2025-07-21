# Copyright (c) 2012-2016 Seafile Ltd.
import seahub.settings as settings

ENABLE_WPS_WEBOFFICE = getattr(settings, 'ENABLE_WPS_WEBOFFICE', False)

# https://domain-example.com/open
WPS_WEBOFFICE_SERVER_URL = getattr(settings, 'WPS_WEBOFFICE_SERVER_URL', '')
WPS_WEBOFFICE_ACCESS_KEY = getattr(settings, 'WPS_WEBOFFICE_ACCESS_KEY', '')
WPS_WEBOFFICE_SECRET_KEY = getattr(settings, 'WPS_WEBOFFICE_SECRET_KEY', '')

WPS_WEBOFFICE_EDIT_LINK = getattr(settings,
                                  'WPS_WEBOFFICE_EDIT_LINK',
                                  '/api/edit/v1/files/{file_id}/link')
WPS_WEBOFFICE_PREVIEW_LINK = getattr(settings,
                                     'WPS_WEBOFFICE_PREVIEW_LINK',
                                     '/api/preview/v1/files/{file_id}/link')

WPS_WEBOFFICE_FILE_EXTENSION = getattr(settings,
                                       'WPS_WEBOFFICE_FILE_EXTENSION',
                                       ('ppt', 'pptx', 'xls', 'xlsx', 'doc', 'docx'))

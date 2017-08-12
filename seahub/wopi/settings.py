# Copyright (c) 2012-2016 Seafile Ltd.
import seahub.settings as settings

# OfficeOnlineServer, OnlyOffice, CollaboraOffice
OFFICE_SERVER_TYPE = getattr(settings, 'OFFICE_SERVER_TYPE', '')

OFFICE_WEB_APP_BASE_URL = getattr(settings, 'OFFICE_WEB_APP_BASE_URL', '')
WOPI_ACCESS_TOKEN_EXPIRATION = getattr(settings, 'WOPI_ACCESS_TOKEN_EXPIRATION', 12 * 60 * 60)
OFFICE_WEB_APP_DISCOVERY_EXPIRATION = getattr(settings, 'OFFICE_WEB_APP_DISCOVERY_EXPIRATION', 7 * 24 * 60 * 60)

ENABLE_OFFICE_WEB_APP = getattr(settings, 'ENABLE_OFFICE_WEB_APP', False)
OFFICE_WEB_APP_FILE_EXTENSION = getattr(settings, 'OFFICE_WEB_APP_FILE_EXTENSION', ())

ENABLE_OFFICE_WEB_APP_EDIT = getattr(settings, 'ENABLE_OFFICE_WEB_APP_EDIT', False)
OFFICE_WEB_APP_EDIT_FILE_EXTENSION = getattr(settings, 'OFFICE_WEB_APP_EDIT_FILE_EXTENSION', ())

## Client certificates ##

# path to client.cert when use client authentication
OFFICE_WEB_APP_CLIENT_CERT = getattr(settings, 'OFFICE_WEB_APP_CLIENT_CERT', '')
# path to client.key when use client authentication
OFFICE_WEB_APP_CLIENT_KEY = getattr(settings, 'OFFICE_WEB_APP_CLIENT_KEY', '')

# path to client.pem when use client authentication
OFFICE_WEB_APP_CLIENT_PEM = getattr(settings, 'OFFICE_WEB_APP_CLIENT_PEM', '')


## Server certificates ##

# Path to a CA_BUNDLE file or directory with certificates of trusted CAs
OFFICE_WEB_APP_SERVER_CA = getattr(settings, 'OFFICE_WEB_APP_SERVER_CA', True)

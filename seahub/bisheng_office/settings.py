# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings

ENABLE_BISHENG_OFFICE = getattr(settings, 'ENABLE_BISHENG_OFFICE', False)
BISHENG_OFFICE_API_KEY = getattr(settings, 'BISHENG_OFFICE_API_KEY', '')
BISHENG_OFFICE_HOST_DOMAIN = getattr(settings, 'BISHENG_OFFICE_HOST_DOMAIN', '')

BISHENG_OFFICE_PRIVILEGE = ['FILE_READ', 'FILE_WRITE', 'FILE_DOWNLOAD', 'FILE_PRINT']
BISHENG_OFFICE_FILE_EXTENSION = ('doc', 'ppt', 'xls', 'docx', 'pptx', 'xlsx')
BISHENG_OFFICE_MIME_TYPE = {
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

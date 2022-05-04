# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8
from django.conf import settings

# # work weixin base
ENABLE_WORK_WEIXIN = getattr(settings, 'ENABLE_WORK_WEIXIN', False)
WORK_WEIXIN_CORP_ID = getattr(settings, 'WORK_WEIXIN_CORP_ID', '')
WORK_WEIXIN_AGENT_SECRET = getattr(settings, 'WORK_WEIXIN_AGENT_SECRET', '')
WORK_WEIXIN_ACCESS_TOKEN_URL = getattr(settings, 'WORK_WEIXIN_ACCESS_TOKEN_URL',
                                       'https://qyapi.weixin.qq.com/cgi-bin/gettoken')

# # admin work weixin departments
WORK_WEIXIN_DEPARTMENTS_URL = getattr(settings, 'WORK_WEIXIN_DEPARTMENTS_URL',
                                      'https://qyapi.weixin.qq.com/cgi-bin/department/list')
WORK_WEIXIN_DEPARTMENT_MEMBERS_URL = getattr(settings, 'WORK_WEIXIN_DEPARTMENT_MEMBERS_URL',
                                             'https://qyapi.weixin.qq.com/cgi-bin/user/list')

# # work weixin oauth
WORK_WEIXIN_AGENT_ID = getattr(settings, 'WORK_WEIXIN_AGENT_ID', '')
WORK_WEIXIN_UID_PREFIX = WORK_WEIXIN_CORP_ID + '_'
WORK_WEIXIN_USER_INFO_AUTO_UPDATE = getattr(settings, 'WORK_WEIXIN_USER_INFO_AUTO_UPDATE', True)
WORK_WEIXIN_AUTHORIZATION_URL = getattr(settings, 'WORK_WEIXIN_AUTHORIZATION_URL',
                                        'https://open.work.weixin.qq.com/wwopen/sso/qrConnect')
WORK_WEIXIN_GET_USER_INFO_URL = getattr(settings, 'WORK_WEIXIN_GET_USER_INFO_URL',
                                        'https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo')
WORK_WEIXIN_GET_USER_PROFILE_URL = getattr(settings, 'WORK_WEIXIN_GET_USER_PROFILE_URL',
                                           'https://qyapi.weixin.qq.com/cgi-bin/user/get')


MP_WORK_WEIXIN_AUTHORIZATION_URL = getattr(settings, 'MP_WORK_WEIXIN_AUTHORIZATION_URL',
                                           'https://open.weixin.qq.com/connect/oauth2/authorize')

# # work weixin notifications
WORK_WEIXIN_NOTIFICATIONS_URL = getattr(settings, 'WORK_WEIXIN_NOTIFICATIONS_URL',
                                        'https://qyapi.weixin.qq.com/cgi-bin/message/send')

# # constants

WORK_WEIXIN_PROVIDER = 'work-weixin'
REMEMBER_ME = True

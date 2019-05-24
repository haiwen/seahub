from django.conf import settings

WORK_WEIXIN_ACCESS_TOKEN_URL = getattr(settings, 'WORK_WEIXIN_ACCESS_TOKEN_URL',
                                       'https://qyapi.weixin.qq.com/cgi-bin/gettoken')
WORK_WEIXIN_DEPARTMENTS_URL = getattr(settings, 'WORK_WEIXIN_DEPARTMENTS_URL',
                                      'https://qyapi.weixin.qq.com/cgi-bin/department/list')
WORK_WEIXIN_DEPARTMENT_MEMBERS_URL = getattr(settings, 'WORK_WEIXIN_DEPARTMENTS_MEMBERS_URL',
                                             'https://qyapi.weixin.qq.com/cgi-bin/user/list')
ENABLE_WORK_WEIXIN_DEPARTMENTS = getattr(settings, 'ENABLE_WORK_WEIXIN_DEPARTMENTS', False)

WORK_WEIXIN_CORP_ID = getattr(settings, 'WORK_WEIXIN_CORP_ID', '')
WORK_WEIXIN_AGENT_ID = getattr(settings, 'WORK_WEIXIN_AGENT_ID', '')
WORK_WEIXIN_AGENT_SECRET = getattr(settings, 'WORK_WEIXIN_AGENT_SECRET', '')
WORK_WEIXIN_PROVIDER = 'work-weixin'
WORK_WEIXIN_UID_PREFIX = WORK_WEIXIN_CORP_ID + '_'

ENABLE_WORK_WEIXIN_OAUTH = getattr(settings, 'ENABLE_WORK_WEIXIN_OAUTH', False)
WORK_WEIXIN_REDIRECT_URI = '/work-weixin/oauth-callback/'
WORK_WEIXIN_AUTHORIZATION_URL = getattr(settings, 'WORK_WEIXIN_AUTHORIZATION_URL',
                                        'https://open.work.weixin.qq.com/wwopen/sso/qrConnect')
WORK_WEIXIN_GET_USER_INFO_URL = getattr(settings, 'WORK_WEIXIN_GET_USER_INFO_URL',
                                        'https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo')
WORK_WEIXIN_GET_USER_PROFILE_URL = getattr(settings, 'WORK_WEIXIN_GET_USER_PROFILE_URL',
                                        'https://qyapi.weixin.qq.com/cgi-bin/user/get')

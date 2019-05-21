from django.conf import settings

WORK_WEIXIN_ACCESS_TOKEN_URL = getattr(settings, 'WORK_WEIXIN_ACCESS_TOKEN_URL',
                                       'https://qyapi.weixin.qq.com/cgi-bin/gettoken')
WORK_WEIXIN_DEPARTMENTS_URL = getattr(settings, 'WORK_WEIXIN_DEPARTMENTS_URL',
                                      'https://qyapi.weixin.qq.com/cgi-bin/department/list')
WORK_WEIXIN_DEPARTMENT_MEMBERS_URL = getattr(settings, 'WORK_WEIXIN_DEPARTMENTS_MEMBERS_URL',
                                             'https://qyapi.weixin.qq.com/cgi-bin/user/list')
ENABLE_WORK_WEIXIN_DEPARTMENTS = getattr(settings, 'ENABLE_WORK_WEIXIN_DEPARTMENTS', False)

WEIXIN_WORK_CORPID = getattr(settings, 'WEIXIN_WORK_CORPID', '')
WEIXIN_WORK_AGENT_ID = getattr(settings, 'WEIXIN_WORK_AGENT_ID', '')
WEIXIN_WORK_AGENT_SECRET = getattr(settings, 'WEIXIN_WORK_AGENT_SECRET', '')
WORK_WEIXIN_EMAIL_DOMAIN = getattr(settings, 'WORK_WEIXIN_EMAIL_DOMAIN', '@work.weixin.com')
WORK_WEIXIN_PROVIDER = 'work-weixin'

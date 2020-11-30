import seahub.settings as settings

ENABLE_DINGTALK = getattr(settings, 'ENABLE_DINGTALK', False)
DINGTALK_AGENT_ID = getattr(settings, 'DINGTALK_AGENT_ID', '')
DINGTALK_GET_USERID_BY_UNIONID = getattr(settings, 'DINGTALK_GET_USERID_BY_UNIONID', 'https://oapi.dingtalk.com/user/getUseridByUnionid')

# for dingtalk qr connect
DINGTALK_QR_CONNECT_LOGIN_REMEMBER_ME = True
DINGTALK_QR_CONNECT_APP_ID = getattr(settings, 'DINGTALK_QR_CONNECT_APP_ID', '')
DINGTALK_QR_CONNECT_APP_SECRET = getattr(settings, 'DINGTALK_QR_CONNECT_APP_SECRET', '')
DINGTALK_QR_CONNECT_AUTHORIZATION_URL = getattr(settings, 'DINGTALK_QR_CONNECT_AUTHORIZATION_URL', 'https://oapi.dingtalk.com/connect/qrconnect')
DINGTALK_QR_CONNECT_USER_INFO_URL = getattr(settings, 'DINGTALK_QR_CONNECT_USER_INFO_URL', 'https://oapi.dingtalk.com/sns/getuserinfo_bycode')
DINGTALK_QR_CONNECT_RESPONSE_TYPE = getattr(settings, 'DINGTALK_QR_CONNECT_RESPONSE_TYPE', 'code')
DINGTALK_QR_CONNECT_SCOPE = getattr(settings, 'DINGTALK_QR_CONNECT_SCOPE', 'snsapi_login')
DINGTALK_QR_CONNECT_CREATE_UNKNOWN_USER = getattr(settings, 'DINGTALK_QR_CONNECT_CREATE_UNKNOWN_USER', True)
DINGTALK_QR_CONNECT_ACTIVATE_USER_AFTER_CREATION = getattr(settings, 'DINGTALK_QR_CONNECT_ACTIVATE_USER_AFTER_CREATION', True)

# for dingtalk department
DINGTALK_DEPARTMENT_APP_KEY = getattr(settings, 'DINGTALK_DEPARTMENT_APP_KEY', '')
DINGTALK_DEPARTMENT_APP_SECRET = getattr(settings, 'DINGTALK_DEPARTMENT_APP_SECRET', '')
DINGTALK_DEPARTMENT_GET_ACCESS_TOKEN_URL = getattr(settings, 'DINGTALK_DEPARTMENT_GET_ACCESS_TOKEN_URL', 'https://oapi.dingtalk.com/gettoken')
DINGTALK_DEPARTMENT_LIST_DEPARTMENT_URL = getattr(settings, 'DINGTALK_DEPARTMENT_LIST_DEPARTMENT_URL', 'https://oapi.dingtalk.com/department/list')
DINGTALK_DEPARTMENT_GET_DEPARTMENT_URL = getattr(settings, 'DINGTALK_DEPARTMENT_GET_DEPARTMENT_URL', 'https://oapi.dingtalk.com/department/get')
DINGTALK_DEPARTMENT_GET_DEPARTMENT_USER_LIST_URL = getattr(settings, 'DINGTALK_DEPARTMENT_GET_DEPARTMENT_USER_LIST_URL', 'https://oapi.dingtalk.com/user/listbypage')
DINGTALK_DEPARTMENT_USER_SIZE = 100

# for dingtalk message
DINGTALK_MESSAGE_SEND_TO_CONVERSATION_URL = getattr(settings, 'DINGTALK_MESSAGE_SEND_TO_CONVERSATION_URL', 'https://oapi.dingtalk.com/topapi/message/corpconversation/asyncsend_v2')

DINGTALK_GET_DETAILED_USER_INFO_URL = getattr(settings, 'DINGTALK_GET_DETAILED_USER_INFO_URL', 'https://oapi.dingtalk.com/user/get')

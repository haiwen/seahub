import urllib
from requests import HTTPError

from social_core.backends.oauth import BaseOAuth2
from social_core.exceptions import AuthCanceled, AuthUnknownError

import logging
logger = logging.getLogger(__name__)

class WeixinWorkOAuth2(BaseOAuth2):
    """WeChat Work OAuth authentication backend"""
    name = 'weixin-work'
    ID_KEY = 'UserId'
    AUTHORIZATION_URL = 'https://open.work.weixin.qq.com/wwopen/sso/qrConnect'
    ACCESS_TOKEN_URL = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken'
    ACCESS_TOKEN_METHOD = 'POST'
    DEFAULT_SCOPE = ['snsapi_login']
    REDIRECT_STATE = False
    EXTRA_DATA = [
        ('nickname', 'username'),
        ('headimgurl', 'profile_image_url'),
    ]

    def get_user_details(self, response):
        """Return user details from Weixin. API URL is:
        https://api.weixin.qq.com/sns/userinfo
        """
        if self.setting('DOMAIN_AS_USERNAME'):
            username = response.get('domain', '')
        else:
            username = response.get('nickname', '')
        return {
            'username': username,
            'profile_image_url': response.get('headimgurl', '')
        }

    def user_data(self, access_token, *args, **kwargs):
        data = self.get_json('https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo', params={
            'access_token': access_token,
            'code': kwargs['request'].GET.get('code')
        })

        nickname = data.get('nickname')
        if nickname:
            # weixin api has some encode bug, here need handle
            data['nickname'] = nickname.encode(
                'raw_unicode_escape'
            ).decode('utf-8')
        return data

    def auth_params(self, state=None):
        appid, secret = self.get_key_and_secret()

        params = {
            'appid': appid,
            'redirect_uri': self.get_redirect_uri(state),
            'agentid': self.setting('AGENTID'),
        }
        if self.STATE_PARAMETER and state:
            params['state'] = state
        if self.RESPONSE_TYPE:
            params['response_type'] = self.RESPONSE_TYPE
        return params

    def auth_complete_params(self, state=None):
        appid, secret = self.get_key_and_secret()
        return {
            'grant_type': 'authorization_code',  # request auth code
            'code': self.data.get('code', ''),  # server response code
            'appid': appid,
            'secret': secret,
            'redirect_uri': self.get_redirect_uri(state),
        }

    def refresh_token_params(self, token, *args, **kwargs):
        appid, secret = self.get_key_and_secret()
        return {
            'refresh_token': token,
            'grant_type': 'refresh_token',
            'appid': appid,
            'secret': secret
        }

    def auth_complete(self, *args, **kwargs):
        """Completes loging process, must return user instance"""
        self.process_error(self.data)

        appid, secret = self.get_key_and_secret()
        try:
            response = self.request_access_token(
                self.ACCESS_TOKEN_URL + '?corpid=%s&corpsecret=%s' % (appid, secret),
                data=self.auth_complete_params(self.validate_state()),
                headers=self.auth_headers(),
                method=self.ACCESS_TOKEN_METHOD
            )
        except HTTPError as err:
            if err.response.status_code == 400:
                raise AuthCanceled(self, response=err.response)
            else:
                raise
        except KeyError:
            raise AuthUnknownError(self)

        if response['errmsg'] != 'ok':
            raise AuthCanceled(self)

        self.process_error(response)
        return self.do_auth(response['access_token'], response=response,
                            *args, **kwargs)


class WeixinWorkOAuth2APP(BaseOAuth2):
    """
    Weixin OAuth authentication backend

    Can't use in web, only in weixin app
    """
    name = 'weixin-work-app'
    ID_KEY = 'UserId'
    AUTHORIZATION_URL = 'https://open.weixin.qq.com/connect/oauth2/authorize'
    ACCESS_TOKEN_URL = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken'
    ACCESS_TOKEN_METHOD = 'POST'
    REDIRECT_STATE = False

    def get_user_details(self, response):
        """Return user details from Weixin. API URL is:
        https://api.weixin.qq.com/sns/userinfo
        """
        if self.setting('DOMAIN_AS_USERNAME'):
            username = response.get('domain', '')
        else:
            username = response.get('nickname', '')
        return {
            'username': username,
            'profile_image_url': response.get('headimgurl', '')
        }

    def user_data(self, access_token, *args, **kwargs):
        data = self.get_json('https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo', params={
            'access_token': access_token,
            'code': kwargs['request'].GET.get('code')
        })

        nickname = data.get('nickname')
        if nickname:
            # weixin api has some encode bug, here need handle
            data['nickname'] = nickname.encode(
                'raw_unicode_escape'
            ).decode('utf-8')
        return data

    def auth_url(self):
        if self.STATE_PARAMETER or self.REDIRECT_STATE:
            # Store state in session for further request validation. The state
            # value is passed as state parameter (as specified in OAuth2 spec),
            # but also added to redirect, that way we can still verify the
            # request if the provider doesn't implement the state parameter.
            # Reuse token if any.
            name = self.name + '_state'
            state = self.strategy.session_get(name)
            if state is None:
                state = self.state_token()
                self.strategy.session_set(name, state)
        else:
            state = None

        params = self.auth_params(state)
        params.update(self.get_scope_argument())
        params.update(self.auth_extra_arguments())
        params = urllib.urlencode(sorted(params.items()))
        return '{}#wechat_redirect'.format(
            self.AUTHORIZATION_URL + '?' + params
        )

    def auth_params(self, state=None):
        appid, secret = self.get_key_and_secret()

        params = {
            'appid': appid,
            'redirect_uri': self.get_redirect_uri(state),
            'agentid': self.setting('AGENTID'),
        }
        if self.STATE_PARAMETER and state:
            params['state'] = state
        if self.RESPONSE_TYPE:
            params['response_type'] = self.RESPONSE_TYPE
        return params

    def auth_complete_params(self, state=None):
        appid, secret = self.get_key_and_secret()
        return {
            'grant_type': 'authorization_code',  # request auth code
            'code': self.data.get('code', ''),  # server response code
            'appid': appid,
            'secret': secret,
        }

    def validate_state(self):
        return None

    def auth_complete(self, *args, **kwargs):
        """Completes loging process, must return user instance"""

        self.process_error(self.data)
        appid, secret = self.get_key_and_secret()
        try:
            response = self.request_access_token(
                self.ACCESS_TOKEN_URL + '?corpid=%s&corpsecret=%s' % (appid, secret),
                data=self.auth_complete_params(self.validate_state()),
                headers=self.auth_headers(),
                method=self.ACCESS_TOKEN_METHOD
            )

        except HTTPError as err:
            if err.response.status_code == 400:
                raise AuthCanceled(self)
            else:
                raise
        except KeyError:
            raise AuthUnknownError(self)

        if response['errmsg'] != 'ok':
            logger.error(response)
            raise AuthCanceled(self)

        self.process_error(response)
        return self.do_auth(response['access_token'], response=response,
                            *args, **kwargs)

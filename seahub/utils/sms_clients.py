#!/usr/bin/env python
# coding=utf-8

import json
import logging
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_dysmsapi20170525.client import Client as Client
from alibabacloud_dysmsapi20170525 import models as models

from seahub.settings import ALIYUN_SMS_CONFIG

logger = logging.getLogger(__name__)


class AliyunSmsClient:

    def __new__(cls, *args, **kwargs):

        if not hasattr(cls, '__instance__'):
            setattr(cls, '__instance__', super().__new__(cls))
        return getattr(cls, '__instance__')

    def __init__(self):

        if not hasattr(self, '_client'):
            config = open_api_models.Config(
                access_key_id=ALIYUN_SMS_CONFIG.get('accessKeyId'),
                access_key_secret=ALIYUN_SMS_CONFIG.get('accessKeySecret'),
                region_id=ALIYUN_SMS_CONFIG.get('regionId'),
            )
            self._client = Client(config)

    def send_verify_code(self, phone, code):

        request = models.SendSmsRequest()
        request.phone_numbers = phone
        request.sign_name = ALIYUN_SMS_CONFIG['signName']
        request.template_code = ALIYUN_SMS_CONFIG['templateCode']
        request.template_param = json.dumps({'code': code})

        try:
            response = self._client.send_sms(request)
            logger.info('success send sms to: %s code: %s', phone, code)
            return True
        except Exception as e:
            logger.error(e)
            logger.error(response.body)
            logger.error('Failed send sms to: %s code: %s', phone, code)
            return False

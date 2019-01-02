# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from django.conf import settings
import requests


logger = logging.getLogger(__name__)


class SeafMessenger(object):
    @staticmethod
    def make_call(device, token):
        logger.info('Fake call to %s: "Your token is: %s"', device.number, token)

    @staticmethod
    def send_sms(device, token):
        api_token = settings.SEAF_MESSAGER_API_TOKEN
        url = settings.SEAF_MESSAGER_SMS_API

        values = {
            'phone_num': device.number,
            'code': token,
        }
        requests.post(url, data=values,
                      headers={'Authorization': 'Token %s' % api_token})

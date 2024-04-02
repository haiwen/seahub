import hashlib
import json
import random
import time
import logging
import requests
import traceback
import seahub.settings as settings

logger = logging.getLogger(__name__)

PINGAN_AUTHORITATIVE_DOMAIN_URL = getattr(settings, 'PINGAN_AUTHORITATIVE_DOMAIN_URL', '')
PINGAN_AUTHORITATIVE_DOMAIN_AUTHSTRING = getattr(settings, 'PINGAN_AUTHORITATIVE_DOMAIN_AUTHSTRING', '')
PINGAN_AUTHORITATIVE_DOMAIN_KEY = getattr(settings, 'PINGAN_AUTHORITATIVE_DOMAIN_KEY', '')
PINGAN_AUTHORITATIVE_DEFAULT_DOMAIN = getattr(settings, 'PINGAN_AUTHORITATIVE_DEFAULT_DOMAIN', '')


def get_authoritative_domain():
    try:
        res_data = ''
        timestamp = int(time.time())
        nonce = random.randint(0, 10)
        sign = "authstring=".__add__(PINGAN_AUTHORITATIVE_DOMAIN_AUTHSTRING).__add__("&nonce=%s&timestamp=%s&key=").__add__(PINGAN_AUTHORITATIVE_DOMAIN_KEY)% (nonce, timestamp)
        signature = hashlib.sha1(sign.encode('utf-8')).hexdigest().upper()
        payload = {
            "AuthString": PINGAN_AUTHORITATIVE_DOMAIN_AUTHSTRING,
            "Timestamp": timestamp,
            "Nonce": nonce,
            "Signature": signature
        }
        headers = {"Content-Type": "application/json"}
        resp_json = requests.post(PINGAN_AUTHORITATIVE_DOMAIN_URL, headers=headers, data=json.dumps(payload)).json()
        if resp_json is not None and resp_json['code'] == 200:
            domins = resp_json['resData']['list']
            for domin in domins:
                if domin['name'] is not None:
                    temp = domin['name'].lstrip('@')
                    res_data += temp + ","
            res_data = res_data.rstrip(",")
    except Exception as e:
        res_data = PINGAN_AUTHORITATIVE_DEFAULT_DOMAIN
        logger.error('get_authoritative_domain exception: {}\r\n{}'.format(e, traceback.format_exc()))
    logger.info("get_authoritative_domain result is: %s",res_data)
    return res_data

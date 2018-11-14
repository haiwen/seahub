import os
import pytest

from seahub.test_utils import BaseTestCase

TRAVIS = 'TRAVIS' in os.environ


class WeixinWorkCBTest(BaseTestCase):
    @pytest.mark.skipif(TRAVIS, reason="This test can only be run in local.")
    def test_get(self, ):
        resp = self.client.get('/weixin-work/callback/?msg_signature=61a7d120857cdb70d8b936ec5b6e8ed172a41926&timestamp=1543304575&nonce=1542460575&echostr=9uB%2FReg5PQk%2FjzejPjhjWmvKXuxh0R4VK7BJRP62lfRj5kZhuAu0mLMM7hnREJQTJxWWw3Y1BB%2F%2FLkE3V88auA%3D%3D')
        assert resp.content == '6819653789729882111'

    @pytest.mark.skipif(TRAVIS, reason="This test can only be run in local.")
    def test_post(self, ):
        data = '<xml><ToUserName><![CDATA[ww24c53566499d354f]]></ToUserName><Encrypt><![CDATA[1fBBPRF7NW4ocCIWFIZK/Pjcn5a0okyx3O8OdbX6Ci2MYq34NaIWuK9jW6dq8pVORvUUsxNP0RVD3vqpq94P932bMyBNKHvFgdn62NaM3vUCSN2SJhwlvNp1KDqMDCX+oiMjcSWJFWXJ0daTpxycSJ88LKH1tA/Z3n18yGq7qs/7qmFJp2kaL6/sb9ATWriA/BCH5UhOaJolqLNm281yAbap+1myr2ELCHPqWz0Gd6Zpvolab6caAp+ivAK5+LohgkrppAjkW7CXI1yM08X0VNArmIT55ZKTFwSW6jeMTBUIIVdYimAKxfxmITxtcu7dVGFQ63hyJTtH6MI0yc7wZRL2ZX9OR5cbO5WTksXv0Rai/3lGSPjThOUS02EI8j4h]]></Encrypt><AgentID><![CDATA[]]></AgentID></xml>'
        resp = self.client.post(
            '/weixin-work/callback/?msg_signature=a237bf482cc9ae8424010eb63a24859c731b2aa7&timestamp=1543309590&nonce=1542845878',
            data=data,
            content_type='application/xml',
        )

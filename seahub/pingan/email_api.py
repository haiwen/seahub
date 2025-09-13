#!python
# -*- encoding:utf-8 -*-
import requests
# import time
import uuid
import json

class PAFileEmailApi(object):
    """docstring for EmailApi"""
    def __init__(self):
        self.send_email_url = 'http://pecp-mngt-api-super.paic.com.cn/pecp-mngt/appsvr/public/smg/sendEmail'
        self.system_name = 'IFBSS_PAFILE'
        self.department_id = 'PA001S000033888'
        self.is_success = False
        self.error_msg = str()
        self.request_id = str()

    def gen_request_id(self):
        """
        :return: universary unique request id
        """
        self.request_id = rid = str(uuid.uuid1())
        return rid

    def _assemble_send_mail_params(self, email, subject, body):
        """Generate params for email request
        :param email: sendto email address
        :param subject: email subject
        :param body: email body
        :return: dict
        """
        param = {
            'SystemName' : self.system_name,
            'DepartmentID' : self.department_id,
            # 1970-01-01 means send the email immediately, otherwise send at specified time
            'SendDate' : '1970-01-01',
            'TemplateName' : 'KJ_IFBSS_PAFILE_20170927001',
            'EmailList' : [
                {
                    'RequestId' : self.gen_request_id(),
                    'EmailAddress' : email,
                    'SendDepartMentID' : self.department_id,
                    'CustomerID' : str(),
                    'subject' : subject,
                    'body' : body,
                }
            ],
        }

        return param

    def send_email(self, email, subject, body):
        """Invoke Email Platform send email api
        :param email: sendto email address
        :param subject: email subject
        :param body: email body
        :return: dict
        """
        params_src = self._assemble_send_mail_params(email, subject, body)
        params = json.dumps(params_src)
        headers = {
            'Accpet' : 'application/json;charset=UTF-8',
            'Content-Type' : 'application/json;charset=UTF-8',
        }
        response = requests.post(self.send_email_url, data=params, headers=headers)
        # import pprint
        # pprint.pprint(params)
        # pprint.pprint(response.json())
        self.parse_send_email_resp(response)
        EmailList = params_src['EmailList'][0]
        request_id = EmailList['RequestId']
        return request_id

    def parse_send_email_resp(self, response):
        if response.status_code == requests.codes.ok:
            self.check_req_result(response)
        else:
            self.error_msg = response.status_code

    def check_req_result(self, response):
        """
        :param response: response object
        response format
        {
            'msg': '',
            'result': {
                'ErrorList': [],
                'SuccessList': [
                    {
                        'Description': '',
                        'RequestID': '1bcfe108-ce5a-11e7-abfb-08606e693568',
                        'ResultID': '0'
                    }
                ]
        },
        """
        try:
            resp_dict = response.json()
            resp_rid = resp_dict['result']['SuccessList'][0]['RequestID']
            resp_result_id = resp_dict['result']['SuccessList'][0]['ResultID']

            if resp_rid == self.request_id and resp_result_id == '0':
                self.is_success = True
        except Exception as e:
            error_msg = str(e)


def main():
    email_api = PAFileEmailApi()
    email = 'tanyi679@pingan.com.cn'
    subject = 'this is a subject from python'
    body = 'Hi Stanley<br/>This is a email body from python程序'
    email_api.send_email(email, subject, body)
    print('is_success => ' + str(email_api.is_success))
    print('error_msg => ' + email_api.error_msg)

if __name__ == '__main__':
    main()

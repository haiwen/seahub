import unittest
import requests
from tests.api.apitestbase import ApiTestBase
from tests.api.urls import LIST_GROUP_AND_CONTACTS_URL, SERVER_INFO_URL

class MiscApiTest(ApiTestBase):
    def test_list_group_and_contacts(self):
        res = self.get(LIST_GROUP_AND_CONTACTS_URL).json()
        self.assertIsNotNone(res)
        self.assertIsInstance(res['contacts'], list)
        self.assertIsNotNone(res['umsgnum'])
        self.assertIsNotNone(res['replynum'])
        self.assertIsInstance(res['groups'], list)
        self.assertIsNotNone(res['gmsgnum'])
        self.assertIsNotNone(res['newreplies'])

    def test_server_info(self):
        r = requests.get(SERVER_INFO_URL)
        r.raise_for_status()
        info = r.json()
        self.assertTrue('version' in info)
        self.assertTrue('seafile-basic' in info['features'])

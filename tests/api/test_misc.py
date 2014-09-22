import unittest
from tests.api.apitestbase import ApiTestBase
from tests.api.urls import LIST_GROUP_AND_CONTACTS_URL

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

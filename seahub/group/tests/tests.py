# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
from datetime import datetime
import os

from django.test import TestCase, Client

from group.models import GroupMessage
from base.accounts import User
from notifications.models import UserNotification
from seahub.test_utils import Fixtures

class GroupTestCase(TestCase, Fixtures):
    """
    Helper base class for all the follow test cases.
    """
    def setUp(self):
        self.testdatapath = os.path.join(os.path.dirname(__file__), "testdata")
        self.user = self.create_user('lennon@thebeatles.com', 'testpassword', is_active=True)

        # Login user
        response = self.client.post('/accounts/login/', {
                'username': 'lennon@thebeatles.com',
                'password': 'testpassword',
                })
        self.assertEqual(response.status_code, 302)

    def _delete_group(self):
        self.client.get('/group/1/?op=dismiss')
        
    def tearDown(self):
        # self._delete_group()        
        self.user.delete()

class CreateGroupTest(GroupTestCase):
    def test_invalid_group_name(self):
        response = self.client.post('/groups/', {
                'group_name': 'test_@group',
                })
        self.assertNotEqual(response.context['error_msg'], None)

    # def test_valid_group_name(self):
    #     response = self.client.post('/groups/', {
    #             'group_name': 'test_group',
    #             })
    #     self.assertEqual(len(response.context['groups']), 1)
        
class GroupMessageTest(GroupTestCase):
    def test_leave_blank_msg(self):
        response = self.client.post('/group/1/', {
                'message': '',
                })
        self.assertEqual(GroupMessage.objects.all().count(), 0)
        
    def test_leave_500_chars_msg(self):
        f = open(os.path.join(self.testdatapath, "valid_message"), "rb")
        message = f.read()
        response = self.client.post('/group/1/', {
                'message': message,
                })
        # Redirect only if it worked
        self.assertEqual(response.status_code, 302)
        self.assertEqual(GroupMessage.objects.all().count(), 1)
    
    def test_leave_501_chars_msg(self):
        f = open(os.path.join(self.testdatapath, "large_message"), "rb")
        message = f.read()
        response = self.client.post('/group/1/', {
                'message': message,
                })
        self.assertEqual(GroupMessage.objects.all().count(), 0)

class ReplyMessageTest(GroupTestCase):
    fixtures = ['groupmessage.json']

    def test_reply_message_fails_with_invalid_message_id(self):
        # Extra parameters to make this a Ajax style request.
        kwargs = {'HTTP_X_REQUESTED_WITH':'XMLHttpRequest'}

        # A reply to invalid group message
        response = self.client.post('/group/reply/2/', {
                'message': 'hello',
                }, follow=True, **kwargs)
        self.assertEqual(response.status_code, 400)
    
    def test_reply_message_succeeds(self):
        # Extra parameters to make this a Ajax style request.
        kwargs = {'HTTP_X_REQUESTED_WITH':'XMLHttpRequest'}

        # A reply to valid group message
        response = self.client.post('/group/reply/1/', {
                'message': 'hello',
                }, follow=True, **kwargs)
        self.assertEqual(response.status_code, 200)

    def test_reply_message_succeeds_and_notify_user(self):
        # Extra parameters to make this a Ajax style request.
        kwargs = {'HTTP_X_REQUESTED_WITH':'XMLHttpRequest'}

        # A reply to valid group message
        response = self.client.post('/group/reply/1/', {
                'message': '@foo: hello',
                }, follow=True, **kwargs)
        self.assertEqual(response.status_code, 200)
        
        # A notification to user
        self.assertEqual(len(UserNotification.objects.filter(to_user='groupuser1@foo.com')), 1)

    def test_no_notification_when_at_user_not_in_group(self):
        pass

class GroupRecommendTest(GroupTestCase):
    def test_recommend_file_with_wrong_format_group_name(self):
        response = self.client.post('/group/recommend/', {
                'groups': 'unparticipated_group,',
                'repo_id': '0b21f61f-3015-4736-bd3f-9fd10cbff3c8',
                'path': '/test.c',
                'message': 'hello',
                'attach_type': 'file',
                }, follow=True)

        self.assertEqual(len(response.context['messages']), 1)
        for message in response.context['messages']:
            self.assertTrue('请检查群组名称' in str(message))
            
        
    def test_recommend_file_to_unparticipated_group(self):
        response = self.client.post('/group/recommend/', {
                'groups': 'unparticipated_group <nobody@none.com>,',
                'repo_id': '0b21f61f-3015-4736-bd3f-9fd10cbff3c8',
                'path': '/test.c',
                'message': 'hello',
                'attach_type': 'file',
                }, follow=True)

        self.assertEqual(len(response.context['messages']), 1)
        for message in response.context['messages']:
            self.assertTrue('请检查是否参加了该群组' in str(message))

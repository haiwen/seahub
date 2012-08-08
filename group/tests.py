"""
This file demonstrates two different styles of tests (one doctest and one
unittest). These will both pass when you run "manage.py test".

Replace these with more appropriate tests for your application.
"""

from datetime import datetime

from django.test import TestCase, Client

from models import GroupMessage
from seahub.base.accounts import User

class GroupTestCase(TestCase):
    """
    Helper base class for all the follow test cases.
    """
    def setUp(self):
        self.user = User.objects.create_user('lennon@thebeatles.com', 'testpassword', is_active=True)
        self.user.save()

        response = self.client.post('/accounts/login/', {
                'username': 'lennon@thebeatles.com',
                'password': 'testpassword',
                })
        self.assertEqual(response.status_code, 302)
        
    def tearDown(self):
        self.user.delete()
    
class GroupTest(GroupTestCase):
    def test_leave_msg(self):
        # Create a group msg
        now = datetime.now()
        self.msg = GroupMessage.objects.create(group_id=101,
                                               from_email='test@test.com',
                                               message='hello',
                                               timestamp=now)
        self.assertEqual(GroupMessage.objects.all().count(), 1)

    def test_create_group(self):
        # Create valid group
        response = self.c.post('/groups/', {
                'group_name': 'test_group',
                })
        self.assertEqual(len(response.context['groups']), 1)
        
        # Create invalid group
        response = self.c.post('/groups/', {
                'group_name': 'test_@group',
                })
        self.assertNotEqual(response.context['error_msg'], None)
        
    def test_msg_reply(self):
        # Extra parameters to make this a Ajax style request.
        kwargs = {'HTTP_X_REQUESTED_WITH':'XMLHttpRequest'}

        # A valid message reply
        response = self.c.post('/group/reply/1/', {
                'message': 'hello',
                }, follow=True, **kwargs)
        self.assertEqual(response.status_code, 200)

        # A reply to invalid group message
        response = self.c.post('/group/reply/2/', {
                'message': 'hello',
                }, follow=True, **kwargs)
        self.assertEqual(response.status_code, 400)
        

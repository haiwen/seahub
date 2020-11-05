# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import reverse
from django.test import TestCase, Client

from .models import Notification
from base.accounts import User

class NotificationTestCase(TestCase):
    """
    Helper base class for all the follow test cases.
    """
    def setUp(self):
        self.new_notification = 'This is a new notification!'
        self.user = User.objects.create_superuser('admin@admin.com', 'testpassword')

    def tearDown(self):
        self.user.delete()

class NotificationTest(NotificationTestCase):

    def login(self):
        response = self.client.post('/accounts/login/', {
                'username': 'admin@admin.com',
                'password': 'testpassword',
                })
        self.assertEqual(response.status_code, 302)

    def test_add_new_notification(self):
        self.login()
        r = self.client.get('/sys/notificationadmin/')
        # Check that response is 200 OK
        self.assertEqual(r.status_code, 200)

        # now there are no notifications 
        self.assertEqual(len(r.context['notes']), 0)

        # try add one notification
        r = self.client.post('/notification/add/', {
                'message': self.new_notification,
                })
        # Redirect only if it worked
        self.assertEqual(r.status_code, 302)

        # look up in database
        notifications = Notification.objects.all()
        self.assertEqual(notifications.count(), 1)

        # check this notification is not set primary, thus will not showed
        # in top bar
        n = Notification.objects.all()[0]
        self.assertFalse(n.primary)
        
    def test_set_primary(self):
        n = Notification()
        n.message = self.new_notification
        n.primary = False
        n.save()

        # set primary
        self.login()
        r = self.client.get(reverse('set_primary', args=[n.id]), {})
        # Redirect only if it worked
        self.assertEqual(r.status_code, 302)

        # now check it's primary
        n = Notification.objects.all()[0]
        self.assertTrue(n.primary)
        
        # check it's showed in top bar
        r = self.client.get('/sys/notificationadmin/')
        self.assertTrue('This is a new notification!' in str(r))

        # and it's still there when reach other pages
        r = self.client.get('/home/my/')
        self.assertTrue('This is a new notification!' in str(r))

    def test_close_notification(self):
        n = Notification()
        n.message = self.new_notification
        n.primary = True
        n.save()

        self.login()
        r = self.client.get('/home/my/')
        self.assertTrue('This is a new notification!' in str(r))

        # now close notification
        r = self.client.get(reverse('notification_close', args=[1]), {})
        # Redirect only if it worked
        self.assertEqual(r.status_code, 302)

        # it's gone
        self.assertTrue('This is a new notification!' not in str(r))

        # and it's gone when reach other pages
        r = self.client.get('/home/my/')
        self.assertTrue('This is a new notification!' not in str(r))


from django.test import TestCase, Client

try:
    from django.contrib.auth import get_user_model
except ImportError:  # for Django 1.3 compatibility
    from django.contrib.auth.models import User as OldUser
    get_user_model = lambda: OldUser

User = get_user_model()


class PasswordSessionTest(TestCase):
    def setUp(self):
        self.password = 'qwe123'
        self.user = User.objects.create_user(email='albert@tugushev.ru', username='albert', password=self.password)
        self.user.is_superuser = True
        self.user.is_staff = True
        self.user.save()

    def tearDown(self):
        self.user.delete()

    def test_invalidate_session_after_change_password(self):
        # Test clients
        client1 = Client()
        client2 = Client()

        # Auth client1 through django.test.client.login
        self.assertTrue(client1.login(username=self.user.username, password=self.password))

        # Auth client2 through admin view
        response = client2.post('/admin/', follow=True, data={'username': self.user.username,
                                                              'password': self.password,
                                                              'this_is_the_login_form': 1,
                                                              'next': '/admin/'},)
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, 'this_is_the_login_form')

        # Change password for client1
        response = client1.post('/password/change/', data={'password': '123qwe'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Hello')

        # client2 should be logged out
        response = client2.get('/admin/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'this_is_the_login_form')
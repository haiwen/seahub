from seahub.test_utils import BaseTestCase
from seahub.two_factor.forms import TOTPDeviceAlreadyExists, TOTPDeviceForm
from seahub.two_factor.models import TOTPDevice


class TOTPDeviceFormSaveTest(BaseTestCase):

    def _form(self, key):
        return TOTPDeviceForm(key=key, user=self.user)

    def test_save_creates_device_when_user_has_no_totp_device(self):
        key = '01' * 20

        device = self._form(key).save()

        self.assertEqual(device.user, self.user.username)
        self.assertEqual(device.key, key)
        self.assertEqual(TOTPDevice.objects.filter(user=self.user.username).count(), 1)

    def test_save_is_idempotent_for_the_same_key(self):
        key = '02' * 20
        original = TOTPDevice.objects.create(user=self.user.username, key=key)

        device = self._form(key).save()

        self.assertEqual(device.pk, original.pk)
        self.assertEqual(TOTPDevice.objects.filter(user=self.user.username).count(), 1)

    def test_save_rejects_a_different_key_without_overwriting_existing_device(self):
        original = TOTPDevice.objects.create(
            user=self.user.username,
            key='03' * 20,
            last_t=123,
        )

        with self.assertRaises(TOTPDeviceAlreadyExists):
            self._form('04' * 20).save()

        original.refresh_from_db()
        self.assertEqual(original.key, '03' * 20)
        self.assertEqual(original.last_t, 123)
        self.assertEqual(TOTPDevice.objects.filter(user=self.user.username).count(), 1)

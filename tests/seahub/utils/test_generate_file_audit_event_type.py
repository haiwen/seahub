from seahub.test_utils import BaseTestCase
from seahub.utils import generate_file_audit_event_type

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class Events():

    def __init__(self, etype, device):
        self.etype = etype
        self.device = device


class GenerateFileAuditEventTypeTest(BaseTestCase):

    def test_generate_file_audit_event_type(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        event_type_device = {
            'file-download-web': '',
            'file-download-share-link': '',
            'file-download-api': 'file-download-api-device',
            'repo-download-sync': 'repo-download-sync-device',
            'repo-upload-sync': 'repo-upload-sync-device',
            'seadrive-download-file': 'seadrive-download-file-device',
            'unknow-type-has-device': 'has-device',
            'unknow-type-no-device': '',
        }

        for key, value in list(event_type_device.items()):

            e = Events(key, value)

            assert generate_file_audit_event_type(e)[1] == value

            if e.etype == 'unknow-type-has-device':
                assert generate_file_audit_event_type(e)[1] == 'has-device'

            if e.etype == 'unknow-type-no-device':
                assert generate_file_audit_event_type(e)[1] == ''

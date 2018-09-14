from mock import patch
from seaserv import seafile_api
from seahub.views.file import can_edit_file
from seahub.test_utils import BaseTestCase

from seahub.settings import FILE_PREVIEW_MAX_SIZE
from seahub.utils import OFFICE_PREVIEW_MAX_SIZE

OFFICE_WEB_APP_FILE_EXTENSION = ('doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx')
OFFICE_WEB_APP_EDIT_FILE_EXTENSION = ('docx', 'pptx', 'xlsx')

ONLYOFFICE_FILE_EXTENSION = ('doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx')
ONLYOFFICE_EDIT_FILE_EXTENSION = ('doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx')

class CanEditFileTest(BaseTestCase):

    def setUp(self):

        self.file_size = 1
        self.exceeded_file_size = FILE_PREVIEW_MAX_SIZE + 1

        self.office_file_size = 1
        self.exceeded_office_file_size = OFFICE_PREVIEW_MAX_SIZE + 1

        self.encrypted_repo_id = seafile_api.create_repo('encrypted-repo',
                '', self.user.username, 'password')
        self.encrypted_repo = seafile_api.get_repo(self.encrypted_repo_id)

    def tearDown(self):
        self.remove_repo(self.repo.id)
        self.remove_repo(self.encrypted_repo.id)

    def can_edit_in_normal_repo_normal_size(self, file_name):

        if file_name.endswith('.doc') or file_name.endswith('.docx'):
            file_size = self.office_file_size
        else:
            file_size = self.file_size

        can_edit, error_msg = can_edit_file(file_name, file_size,
                self.repo)
        return can_edit

    def can_edit_in_encrypted_repo_normal_size(self, file_name):

        if file_name.endswith('.doc') or file_name.endswith('.docx'):
            file_size = self.office_file_size
        else:
            file_size = self.file_size

        can_edit, error_msg = can_edit_file(file_name, file_size,
                self.encrypted_repo)
        return can_edit

    def can_edit_in_normal_repo_exceeded_size(self, file_name):

        if file_name.endswith('.doc') or file_name.endswith('.docx'):
            file_size = self.exceeded_office_file_size
        else:
            file_size = self.exceeded_file_size

        can_edit, error_msg = can_edit_file(file_name, file_size,
                self.repo)
        return can_edit

    def can_edit_in_encrypted_repo_exceeded_size(self, file_name):

        if file_name.endswith('.doc') or file_name.endswith('.docx'):
            file_size = self.exceeded_office_file_size
        else:
            file_size = self.exceeded_file_size

        can_edit, error_msg = can_edit_file(file_name, file_size,
                self.encrypted_repo)
        return can_edit

    def test_iso(self):

        file_name = '123.iso'

        assert not self.can_edit_in_normal_repo_normal_size(file_name)
        assert not self.can_edit_in_normal_repo_exceeded_size(file_name)
        assert not self.can_edit_in_encrypted_repo_normal_size(file_name)
        assert not self.can_edit_in_encrypted_repo_exceeded_size(file_name)

    def test_pdf(self):

        file_name = '123.pdf'

        assert not self.can_edit_in_normal_repo_normal_size(file_name)
        assert not self.can_edit_in_normal_repo_exceeded_size(file_name)
        assert not self.can_edit_in_encrypted_repo_normal_size(file_name)
        assert not self.can_edit_in_encrypted_repo_exceeded_size(file_name)

    def test_jpg(self):

        file_name = '123.jpg'

        assert not self.can_edit_in_normal_repo_normal_size(file_name)
        assert not self.can_edit_in_normal_repo_exceeded_size(file_name)
        assert not self.can_edit_in_encrypted_repo_normal_size(file_name)
        assert not self.can_edit_in_encrypted_repo_exceeded_size(file_name)

    def test_txt(self):

        file_name = '123.txt'

        assert self.can_edit_in_normal_repo_normal_size(file_name)
        assert not self.can_edit_in_normal_repo_exceeded_size(file_name)
        assert self.can_edit_in_encrypted_repo_normal_size(file_name)
        assert not self.can_edit_in_encrypted_repo_exceeded_size(file_name)

    def test_md(self):

        file_name = '123.md'

        assert self.can_edit_in_normal_repo_normal_size(file_name)
        assert not self.can_edit_in_normal_repo_exceeded_size(file_name)
        assert self.can_edit_in_encrypted_repo_normal_size(file_name)
        assert not self.can_edit_in_encrypted_repo_exceeded_size(file_name)

    def test_doc(self):

        file_name = '123.doc'

        assert not self.can_edit_in_normal_repo_normal_size(file_name)
        assert not self.can_edit_in_normal_repo_exceeded_size(file_name)
        assert not self.can_edit_in_encrypted_repo_normal_size(file_name)
        assert not self.can_edit_in_encrypted_repo_exceeded_size(file_name)

    @patch('seahub.views.file.HAS_OFFICE_CONVERTER', True)
    def test_doc_has_office_converter(self):

        file_name = '123.doc'

        assert not self.can_edit_in_normal_repo_normal_size(file_name)
        assert not self.can_edit_in_normal_repo_exceeded_size(file_name)
        assert not self.can_edit_in_encrypted_repo_normal_size(file_name)
        assert not self.can_edit_in_encrypted_repo_exceeded_size(file_name)

    @patch('seahub.views.file.ENABLE_ONLYOFFICE', True)
    @patch('seahub.views.file.ONLYOFFICE_FILE_EXTENSION',
            ONLYOFFICE_FILE_EXTENSION)
    @patch('seahub.views.file.ONLYOFFICE_EDIT_FILE_EXTENSION',
            ONLYOFFICE_EDIT_FILE_EXTENSION)
    def test_doc_enable_onlyoffice(self):

        file_name = '123.doc'

        assert self.can_edit_in_normal_repo_normal_size(file_name)
        assert self.can_edit_in_normal_repo_exceeded_size(file_name)
        assert not self.can_edit_in_encrypted_repo_normal_size(file_name)
        assert not self.can_edit_in_encrypted_repo_exceeded_size(file_name)

    @patch('seahub.views.file.ENABLE_OFFICE_WEB_APP', True)
    @patch('seahub.views.file.OFFICE_WEB_APP_FILE_EXTENSION',
            OFFICE_WEB_APP_FILE_EXTENSION)
    @patch('seahub.views.file.ENABLE_OFFICE_WEB_APP_EDIT', True)
    @patch('seahub.views.file.OFFICE_WEB_APP_EDIT_FILE_EXTENSION',
            OFFICE_WEB_APP_EDIT_FILE_EXTENSION)
    def test_doc_enable_office_web_app(self):

        file_name = '123.doc'

        assert not self.can_edit_in_normal_repo_normal_size(file_name)
        assert not self.can_edit_in_normal_repo_exceeded_size(file_name)
        assert not self.can_edit_in_encrypted_repo_normal_size(file_name)
        assert not self.can_edit_in_encrypted_repo_exceeded_size(file_name)

    def test_docx(self):

        file_name = '123.docx'

        assert not self.can_edit_in_normal_repo_normal_size(file_name)
        assert not self.can_edit_in_normal_repo_exceeded_size(file_name)
        assert not self.can_edit_in_encrypted_repo_normal_size(file_name)
        assert not self.can_edit_in_encrypted_repo_exceeded_size(file_name)

    @patch('seahub.views.file.HAS_OFFICE_CONVERTER', True)
    def test_docx_has_office_converter(self):

        file_name = '123.docx'

        assert not self.can_edit_in_normal_repo_normal_size(file_name)
        assert not self.can_edit_in_normal_repo_exceeded_size(file_name)
        assert not self.can_edit_in_encrypted_repo_normal_size(file_name)
        assert not self.can_edit_in_encrypted_repo_exceeded_size(file_name)

    @patch('seahub.views.file.ENABLE_ONLYOFFICE', True)
    @patch('seahub.views.file.ONLYOFFICE_FILE_EXTENSION',
            ONLYOFFICE_FILE_EXTENSION)
    @patch('seahub.views.file.ONLYOFFICE_EDIT_FILE_EXTENSION',
            ONLYOFFICE_EDIT_FILE_EXTENSION)
    def test_docx_enable_onlyoffice(self):

        file_name = '123.docx'

        assert self.can_edit_in_normal_repo_normal_size(file_name)
        assert self.can_edit_in_normal_repo_exceeded_size(file_name)
        assert not self.can_edit_in_encrypted_repo_normal_size(file_name)
        assert not self.can_edit_in_encrypted_repo_exceeded_size(file_name)

    @patch('seahub.views.file.ENABLE_OFFICE_WEB_APP', True)
    @patch('seahub.views.file.OFFICE_WEB_APP_FILE_EXTENSION',
            OFFICE_WEB_APP_FILE_EXTENSION)
    @patch('seahub.views.file.ENABLE_OFFICE_WEB_APP_EDIT', True)
    @patch('seahub.views.file.OFFICE_WEB_APP_EDIT_FILE_EXTENSION',
            OFFICE_WEB_APP_EDIT_FILE_EXTENSION)
    def test_docx_enable_office_web_app(self):

        file_name = '123.docx'

        assert self.can_edit_in_normal_repo_normal_size(file_name)
        assert self.can_edit_in_normal_repo_exceeded_size(file_name)
        assert not self.can_edit_in_encrypted_repo_normal_size(file_name)
        assert not self.can_edit_in_encrypted_repo_exceeded_size(file_name)

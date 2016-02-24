from seahub.test_utils import BaseTestCase
from seahub.utils.file_size import get_file_size_unit

class GetFileSizeUnitTest(BaseTestCase):
    def test_invalid_type(self):
        with self.assertRaises(TypeError):
            get_file_size_unit('ff')

    def test_valid_type(self):
        assert get_file_size_unit('KB') == 1000 ** 1
        assert get_file_size_unit('MB') == 1000 ** 2
        assert get_file_size_unit('GB') == 1000 ** 3
        assert get_file_size_unit('TB') == 1000 ** 4
        assert get_file_size_unit('PB') == 1000 ** 5

        assert get_file_size_unit('KiB') == 1024 ** 1
        assert get_file_size_unit('MiB') == 1024 ** 2
        assert get_file_size_unit('GiB') == 1024 ** 3
        assert get_file_size_unit('TiB') == 1024 ** 4
        assert get_file_size_unit('PiB') == 1024 ** 5

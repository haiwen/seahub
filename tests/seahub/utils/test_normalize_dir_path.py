import posixpath
from random import randint

from tests.common.utils import randstring
from seahub.test_utils import BaseTestCase
from seahub.utils import normalize_dir_path

class NormalizeDirPathTest(BaseTestCase):

    def test_normalize_dir_path(self):

        slash = '/'
        folder_1 = randstring(3)
        folder_2 = randstring(3)

        random_slash = ''
        for i in range(1, randint(1, 10)):
            random_slash += slash

        posix_path = posixpath.join(folder_1, folder_2)
        correct_path = slash + posix_path + slash

        path_without_slash = posix_path
        path_starts_with_random_slash = random_slash + posix_path
        path_ends_with_random_slash = posix_path + random_slash
        path_with_slash = random_slash + posix_path + random_slash

        assert normalize_dir_path(path_without_slash) == correct_path
        assert normalize_dir_path(path_starts_with_random_slash) == correct_path
        assert normalize_dir_path(path_ends_with_random_slash) == correct_path
        assert normalize_dir_path(path_with_slash) == correct_path

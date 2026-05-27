from seahub.test_utils import BaseTestCase
from seahub.search.utils import is_invisible_path


REPO = 'repo-1'


def _paths(*paths):
    return {REPO: set(paths)}


class IsInvisiblePathTest(BaseTestCase):

    def test_file_inside_invisible_folder_is_blocked(self):
        assert is_invisible_path(_paths('/HR/'), REPO, '/HR/secret.txt') is True

    def test_file_inside_invisible_folder_no_trailing_slash_in_stored_path(self):
        assert is_invisible_path(_paths('/HR'), REPO, '/HR/secret.txt') is True

    def test_nested_file_inside_invisible_folder_is_blocked(self):
        assert is_invisible_path(_paths('/HR/'), REPO, '/HR/sub/deeper.txt') is True

    def test_file_outside_invisible_folder_is_visible(self):
        assert is_invisible_path(_paths('/HR/'), REPO, '/Public/doc.txt') is False

    def test_sibling_prefix_folder_is_not_invisible_when_stored_with_slash(self):
        assert is_invisible_path(_paths('/HR/'), REPO, '/HRbackup/data.txt') is False

    def test_sibling_prefix_folder_is_not_invisible_when_stored_without_slash(self):
        assert is_invisible_path(_paths('/HR'), REPO, '/HRbackup/data.txt') is False

    def test_sibling_prefix_file_at_root_is_not_invisible(self):
        assert is_invisible_path(_paths('/HR'), REPO, '/HRfile.txt') is False

    def test_path_equal_to_invisible_folder_is_blocked(self):
        assert is_invisible_path(_paths('/HR/'), REPO, '/HR') is True
        assert is_invisible_path(_paths('/HR'), REPO, '/HR') is True

    def test_multiple_invisible_paths_match_independently(self):
        paths = _paths('/HR/', '/Legal/')
        assert is_invisible_path(paths, REPO, '/HR/x.txt') is True
        assert is_invisible_path(paths, REPO, '/Legal/y.txt') is True
        assert is_invisible_path(paths, REPO, '/Public/z.txt') is False

    def test_unknown_repo_returns_false(self):
        assert is_invisible_path(_paths('/HR/'), 'some-other-repo', '/HR/x.txt') is False

    def test_empty_invisible_set_returns_false(self):
        assert is_invisible_path({REPO: set()}, REPO, '/HR/x.txt') is False

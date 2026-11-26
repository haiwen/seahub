from types import SimpleNamespace

from seahub.search.utils import is_invisible_repo_path


def test_virtual_library_hides_both_origin_and_view_paths():
    repo = SimpleNamespace(id='view', origin_repo_id='origin', origin_path='/shared')
    invisible = {'origin': {'/shared/private/'}, 'view': {'/restricted'}}

    assert is_invisible_repo_path(invisible, repo, '/private')
    assert is_invisible_repo_path(invisible, repo, '/private/nested/file.md')
    assert is_invisible_repo_path(invisible, repo, '/restricted/file.md')
    assert not is_invisible_repo_path(invisible, repo, '/private-notes/file.md')


def test_ordinary_library_checks_only_its_own_paths():
    repo = SimpleNamespace(id='ordinary', origin_repo_id=None)
    invisible = {'other': {'/shared'}, 'ordinary': {'/private'}}

    assert is_invisible_repo_path(invisible, repo, '/private/file.md')
    assert not is_invisible_repo_path(invisible, repo, '/shared/file.md')

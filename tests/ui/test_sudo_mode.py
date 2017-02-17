import pytest

from tests.common.common import ADMIN_PASSWORD

# TODO: Find a way to test the sudo mode behaviour
@pytest.mark.xfail
def test_sudo_mode_required(admin_browser_once):
    b = admin_browser_once
    b.visit('/sys/useradmin/')
    assert b.path == '/sys/sudo/', (
        'when viewing sysadmin-only pages for the first time, '
        'the browser should be redirected to the sudo mode page'
    )

    b.fill_form({
        'password': ADMIN_PASSWORD,
    })
    b.submit_by_input_name('password')
    assert b.path == '/sys/useradmin/', (
        'after entering password, '
        'the browser should be redirected back to the previous page'
    )

@pytest.mark.xfail
def test_sudo_mode_rejects_wrong_password(admin_browser_once):
    b = admin_browser_once
    b.visit('/sys/useradmin/')
    assert b.path == '/sys/sudo/', (
        'when viewing sysadmin-only pages for the first time, '
        'the browser should be redirected to the sudo mode page'
    )

    b.fill_form({
        'password': 'wrong-password',
    })
    b.submit_by_input_name('password')
    assert b.path == '/sys/sudo/', (
        'after entering the wrong password, '
        'the browser should still be on the sudo mode page'
    )

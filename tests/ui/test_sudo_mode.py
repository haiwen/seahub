from tests.common.common import ADMIN_USERNAME, ADMIN_PASSWORD

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

    b.visit('/sys/groupadmin/')
    assert b.path == '/sys/groupadmin/', (
        'once the admin enters the password, '
        'he would not be asked again within a certain time'
    )

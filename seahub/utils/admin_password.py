from seahub.options.models import UserOptions


def require_password_change(user):
    """Require a user to change an administrator-assigned password on login."""
    return UserOptions.objects.set_force_passwd_change(user.username)

from seahub.profile.models import Profile
from seahub.utils import gen_user_virtual_id

USER_FIELDS = ['username', 'email']


def get_username(strategy, details, backend, user=None, *args, **kwargs):
    print details
    print '-------'
    if 'username' not in backend.setting('USER_FIELDS', USER_FIELDS):
        return
    storage = strategy.storage

    if not user:
        final_username = gen_user_virtual_id()
    else:
        final_username = storage.user.get_username(user)

    return {'username': final_username}


def create_user(strategy, details, backend, user=None, *args, **kwargs):
    if user:
        return {'is_new': False}

    fields = dict((name, kwargs.get(name, details.get(name)))
                  for name in backend.setting('USER_FIELDS', USER_FIELDS))
    if not fields:
        return

    return {
        'is_new': True,
        'user': strategy.create_user(**fields)
    }

def save_profile(strategy, details, backend, user=None, *args, **kwargs):
    if not user:
        return
    email = details.get('email', '')
    if email:
        Profile.objects.add_or_update(username=user.username,
                                      contact_email=email)

    fullname = details.get('fullname', '')
    if fullname:
        Profile.objects.add_or_update(username=user.username,
                                      nickname=fullname)

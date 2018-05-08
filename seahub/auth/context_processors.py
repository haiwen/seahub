def auth(request):
    """
    Returns context variables required by apps that use Django's authentication
    system.

    If there is no 'user' attribute in the request, uses AnonymousUser (from
    django.contrib.auth).
    """
    if hasattr(request, 'user'):
        user = request.user
    else:
        from seahub.auth.models import AnonymousUser
        user = AnonymousUser()

    return {
        'user': user,
        'perms': None,
    }

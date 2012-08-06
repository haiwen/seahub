from django.http import Http404

def sys_staff_required(func):
    """
    Decorator for views that checks the user is system staff.
    """
    def _decorated(request, *args, **kwargs):
        if request.user.is_staff:
            return func(request, *args, **kwargs)
        raise Http404
    return _decorated
    

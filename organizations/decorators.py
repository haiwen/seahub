# encoding: utf-8
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect, HttpResponse

from seaserv import get_user_current_org

def org_staff_required(func):
    """
    Decorator for views that checks the user is org staff.
    """
    def _decorated(request, *args, **kwargs):
        user = request.user.username
        url_prefix = kwargs.get('url_prefix', '')
        org = get_user_current_org(user, url_prefix)
        if org and org.is_staff:
            return func(request, *args, **kwargs)
        return HttpResponseRedirect(reverse('myhome'))    
    return _decorated

from django.contrib import messages
from django.http import HttpResponseRedirect, Http404
from django.shortcuts import get_object_or_404, render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _

from seahub.auth import login as auth_login
from seahub.auth import get_backends
from seahub.base.accounts import User
from seahub.constants import GUEST_USER
from seahub.invitations.models import Invitation
from seahub.settings import SITE_ROOT

def token_view(request, token):
    """Show form to let user set password.
    """
    i = get_object_or_404(Invitation, token=token)
    if i.is_expired():
        raise Http404

    if request.method == 'POST':
        passwd = request.POST.get('password', '')
        if not passwd:
            return HttpResponseRedirect(request.META.get('HTTP_REFERER'))

        try:
            User.objects.get(email=i.accepter)
            messages.error(request, _('A user with this email already exists.'))
        except User.DoesNotExist:
            # Create user, set that user as guest, and log user in.
            u = User.objects.create_user(email=i.accepter, password=passwd,
                                         is_active=True)
            u.role = GUEST_USER
            u.save()

            i.accept()          # Update invitaion accept time.

            for backend in get_backends():
                u.backend = "%s.%s" % (backend.__module__, backend.__class__.__name__)
            auth_login(request, u)
            return HttpResponseRedirect(SITE_ROOT)

    return render_to_response('invitations/token_view.html', {
        'iv': i,
    }, context_instance=RequestContext(request))

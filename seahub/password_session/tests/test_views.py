from django.contrib.auth.decorators import login_required
from django.http import HttpResponse

from password_session import update_session_auth_hash


@login_required(login_url='/admin/')
def change_password_view(request):
    user = request.user
    user.set_password(request.POST.get('password'))
    user.save()
    update_session_auth_hash(request, user)
    return HttpResponse("Hello, %s! Your password has been changed!" % user.username)
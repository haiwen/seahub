# encoding: utf-8
from django.conf import settings
import simplejson as json
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response, get_object_or_404
from django.template import Context, RequestContext
from django.contrib import messages
from django.utils.translation import ugettext as _

from seaserv import ccnet_rpc, ccnet_threaded_rpc, get_binding_peerids
from pysearpc import SearpcError

from forms import ProfileForm
from models import Profile
from utils import refresh_cache
from seahub.auth.decorators import login_required
from seahub.utils import render_error
from seahub.base.accounts import User
from seahub.contacts.models import Contact
from seahub.options.models import UserOptions, CryptoOptionNotSetError

@login_required
def edit_profile(request):
    """
    Show and edit user profile.
    """
    username = request.user.username

    if request.method == 'POST':
        form = ProfileForm(request.POST)
        if form.is_valid():
            nickname = form.cleaned_data['nickname']
            intro = form.cleaned_data['intro']
            try:
                profile = Profile.objects.get(user=request.user.username)
            except Profile.DoesNotExist:
                profile = Profile()
                
            profile.user = username
            profile.nickname = nickname
            profile.intro = intro
            profile.save()
            messages.success(request, _(u'Successfully edited profile.'))
            # refresh nickname cache
            refresh_cache(request.user.username)
            
            return HttpResponseRedirect(reverse('edit_profile'))
        else:
            messages.error(request, _(u'Failed to edit profile'))
    else:
        try:
            profile = Profile.objects.get(user=request.user.username)
            form = ProfileForm({
                    'nickname': profile.nickname,
                    'intro': profile.intro,
                    })
        except Profile.DoesNotExist:
            form = ProfileForm()

    # common logic
    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False   

    sub_lib_enabled = UserOptions.objects.is_sub_lib_enabled(username)
            
    return render_to_response('profile/set_profile.html', {
            'form': form,
            'server_crypto': server_crypto,
            "sub_lib_enabled": sub_lib_enabled,
            }, context_instance=RequestContext(request))

def user_profile(request, username_or_id):
    user_nickname = ''
    user_intro = ''
    user = None

    # fetch the user by username or id, try id first
    try:
        user_id = int(username_or_id)
        try:
            user = User.objects.get(id=user_id)
        except:
            pass
    except ValueError:
        try:
            user = User.objects.get(email=username_or_id)
        except User.DoesNotExist:
            pass
        
    if user:
        # profile = Profile.objects.filter(user=user)
        # if profile:
        #     profile = profile[0]
        #     user_nickname = profile.nickname
        #     user_intro = profile.intro
        # else:
        #     username = user.username
        #     idx = username.find('@')
        #     user_nickname = username if idx <= 0 else username[:idx]
        #     user_intro = ''
        return HttpResponseRedirect(reverse('user_msg_list', args=[user.email]))
    else:
        user_nickname = ""
        user_intro = _(u'Has not accepted invitation yet')

    return render_to_response('profile/user_profile.html', {
            'user': user,
            'nickname': user_nickname,
            'intro': user_intro,
            }, context_instance=RequestContext(request))

@login_required
def get_user_profile(request, user):
    data = {
            'email': user,
            'user_nickname': '',
            'user_intro': '',
            'err_msg': '',
            'new_user': ''
        } 
    content_type = 'application/json; charset=utf-8'

    try:
        user_check = User.objects.get(email=user)
    except User.DoesNotExist:
        user_check = None
        
    if user_check:
        profile = Profile.objects.filter(user=user)
        if profile:
            profile = profile[0]
            data['user_nickname'] = profile.nickname
            data['user_intro'] = profile.intro
    else:
        data['user_intro'] = _(u'Has not accepted invitation yet')

    if user == request.user.username or \
            Contact.objects.filter(user_email=request.user.username,
                                   contact_email=user).count() > 0:
        data['new_user'] = False
    else:
        data['new_user'] = True

    return HttpResponse(json.dumps(data), content_type=content_type)

@login_required
def delete_user_account(request, user):
    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = settings.SITE_ROOT

    if user == 'demo@seafile.com':
        messages.error(request, _(u'Demo account can not be deleted.'))
        return HttpResponseRedirect(next)
        
    if request.user.username != user:
        messages.error(request, _(u'Operation Failed. You can only delete account of your own'))
        return HttpResponseRedirect(next)
    else:
        user = User.objects.get(email=user)
        user.delete()
        return HttpResponseRedirect(settings.LOGIN_URL)

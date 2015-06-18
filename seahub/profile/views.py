# encoding: utf-8
from django.conf import settings
import json
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.contrib import messages
from django.utils.translation import ugettext as _

import seaserv
from seaserv import seafile_api

from forms import DetailedProfileForm
from models import Profile, DetailedProfile
from utils import refresh_cache
from seahub.auth.decorators import login_required
from seahub.utils import is_org_context, clear_token, is_pro_version
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.contacts.models import Contact
from seahub.options.models import UserOptions, CryptoOptionNotSetError
from seahub.views import get_owned_repo_list

@login_required
def edit_profile(request):
    """
    Show and edit user profile.
    """
    username = request.user.username
    form_class = DetailedProfileForm

    if request.method == 'POST':
        form = form_class(request.POST)
        if form.is_valid():
            form.save(username=username)
            messages.success(request, _(u'Successfully edited profile.'))
            # refresh nickname cache
            refresh_cache(request.user.username)
            
            return HttpResponseRedirect(reverse('edit_profile'))
        else:
            messages.error(request, _(u'Failed to edit profile'))
    else:
        profile = Profile.objects.get_profile_by_user(username)
        d_profile = DetailedProfile.objects.get_detailed_profile_by_user(
            username)

        init_dict = {}
        if profile:
            init_dict['nickname'] = profile.nickname
            init_dict['intro'] = profile.intro
        if d_profile:
            init_dict['department'] = d_profile.department
            init_dict['telephone'] = d_profile.telephone
        form = form_class(init_dict)
        
    # common logic
    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False   

    sub_lib_enabled = UserOptions.objects.is_sub_lib_enabled(username)

    default_repo_id = UserOptions.objects.get_default_repo(username)
    if default_repo_id:
        default_repo = seafile_api.get_repo(default_repo_id)
    else:
        default_repo = None

    owned_repos = get_owned_repo_list(request)

    return render_to_response('profile/set_profile.html', {
            'form': form,
            'server_crypto': server_crypto,
            "sub_lib_enabled": sub_lib_enabled,
            'force_server_crypto': settings.FORCE_SERVER_CRYPTO,
            'default_repo': default_repo,
            'owned_repos': owned_repos,
            'is_pro': is_pro_version(),
            }, context_instance=RequestContext(request))

@login_required
def user_profile(request, username_or_id):
    # fetch the user by username or id, try id first
    user = None
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

    nickname = '' if user is None else email2nickname(user.username)

    if user is not None:
        profile = Profile.objects.get_profile_by_user(user.username)
        intro = profile.intro if profile else ''
        d_profile = DetailedProfile.objects.get_detailed_profile_by_user(
            user.username)
    else:
        intro = _(u'Has not accepted invitation yet')
        d_profile = None

    return render_to_response('profile/user_profile.html', {
            'username_or_id': username_or_id,
            'user': user,
            'nickname': nickname,
            'intro': intro,
            'd_profile': d_profile,
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
def delete_user_account(request):
    username = request.user.username

    if username == 'demo@seafile.com':
        messages.error(request, _(u'Demo account can not be deleted.'))
        next = request.META.get('HTTP_REFERER', settings.SITE_ROOT)
        return HttpResponseRedirect(next)

    user = User.objects.get(email=username)
    user.delete()
    clear_token(username)

    if is_org_context(request):
        org_id = request.user.org.org_id
        seaserv.ccnet_threaded_rpc.remove_org_user(org_id, username)

    return HttpResponseRedirect(settings.LOGIN_URL)

@login_required
def default_repo(request):
    """Handle post request to create default repo for user.
    """
    if request.method != 'POST':
        raise Http404

    repo_id = request.POST.get('dst_repo', '')
    referer = request.META.get('HTTP_REFERER', None)
    next = settings.SITE_ROOT if referer is None else referer

    repo = seafile_api.get_repo(repo_id)
    if repo is None:
        messages.error(request, _('Failed to set default library.'))
        return HttpResponseRedirect(next)

    if repo.encrypted:
        messages.error(request, _('Can not set encrypted library as default library.'))
        return HttpResponseRedirect(next)

    username = request.user.username
    UserOptions.objects.set_default_repo(username, repo.id)
    messages.success(request, _('Successfully set "%s" as your default library.') % repo.name)
    return HttpResponseRedirect(next)

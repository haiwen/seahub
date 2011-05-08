from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response, get_object_or_404
from django.template.loader import get_template
from django.template import Context, RequestContext
from django.contrib.auth.decorators import login_required
from django.core.urlresolvers import reverse

import datetime

from forms import SetUserProfileForm
from models import UserProfile
from seaserv import ccnet_rpc

@login_required
def show_profile(request):
    groups = []
    try:
        profile = request.user.get_profile()
    except UserProfile.DoesNotExist:
        profile = UserProfile(user=request.user)
        profile.save()
    return render_to_response('profile/profile.html',
                              { 'groups': groups,
                                'profile': profile, },
                              context_instance=RequestContext(request))


@login_required
def set_profile(request):
    error_msg = None
    origin_id = None
    if request.method == 'POST':
        ccnet_user_id = request.POST.get('ccnet_user_id', None)
        origin_id = ccnet_user_id
        if not ccnet_user_id:
            error_msg = "You must specify ccnet user id"
        elif len(ccnet_user_id) != 40:
            error_msg = "Ccnet User ID must be of length 40"
        else:
            try:
                profile = request.user.get_profile()
            except UserProfile.DoesNotExist:
                profile = UserProfile(user=request.user)
                profile.save()
            try:
                ccnet_rpc.add_client(ccnet_user_id)
            except:
                error_msg = "Ccnet Deamon is not available, try again later"
            else:
                profile.ccnet_user_id = ccnet_user_id
                profile.save()
                return HttpResponseRedirect(reverse(show_profile))
    else:
        try:
            profile = request.user.get_profile()
        except UserProfile.DoesNotExist:
            profile = UserProfile(user=request.user)
            profile.save()
        origin_id = profile.ccnet_user_id

    return render_to_response('profile/set_profile.html',
                              { 'error_msg': error_msg,
                                'origin_id': origin_id },
                              context_instance=RequestContext(request))

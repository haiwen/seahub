from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response, get_object_or_404
from django.template.loader import get_template
from django.template import Context, RequestContext
from django.contrib.auth.decorators import login_required
from django.core.urlresolvers import reverse

import datetime

from forms import SetUserProfileForm
from models import UserProfile, UserCcnetConf
from seaserv import ccnet_rpc, translate_time_usec

@login_required
def show_profile(request):
    try:
        profile = request.user.get_profile()
    except UserProfile.DoesNotExist:
        profile = UserProfile(user=request.user)
        profile.save()

    try:
        profile_timestamp = ccnet_rpc.get_user_profile_timestamp(profile.ccnet_user_id)
        profile_timestamp = translate_time_usec(profile_timestamp)
    except:
        profile_timestamp = None
        
    return render_to_response('profile/profile.html',
                              { 'profile': profile,
                                'profile_timestamp': profile_timestamp},
                              context_instance=RequestContext(request))


@login_required
def set_profile(request):
    error_msg = None
    origin_id = None
    if request.method == 'POST':
        ccnet_user_id = request.POST.get('ccnet_user_id', '').strip()
        origin_id = ccnet_user_id
        if not ccnet_user_id:
            error_msg = "You must specify Key ID"
        elif len(ccnet_user_id) != 40:
            error_msg = "Key ID must be of length 40"
        else:
            try:
                profile = request.user.get_profile()
            except UserProfile.DoesNotExist:
                profile = UserProfile(user=request.user)
                profile.save()
            try:
                ccnet_rpc.add_client(ccnet_user_id)
            except Exception, e:
                error_msg = "Ccnet Daemon is not available, try again later"
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


@login_required
def get_ccnet_profile(request):
    try:
        ccnet_conf = UserCcnetConf.objects.get(user=request.user)
        return HttpResponse(ccnet_conf.ccnet_profile)
    except UserCcnetConf.DoesNotExist:
        return HttpResponse("")


@login_required
def set_ccnet_profile(request):
    try:
        profile = request.user.get_profile()
    except UserProfile.DoesNotExist:
        return HttpResponse("Error: You have not set seafile id yet.")
    ccnet_id = profile.ccnet_user_id

    if request.method == 'POST':
        ccnet_profile = request.POST.get('ccnet_profile', None)
        try:
            ccnet_conf = UserCcnetConf.objects.get(ccnet_user_id=ccnet_id)
            ccnet_conf.ccnet_profile = ccnet_profile
            ccnet_conf.save()
        except UserCcnetConf.DoesNotExist:
            ccnet_conf = UserCcnetConf(user=request.user,
                                       ccnet_user_id=ccnet_id,
                                       ccnet_profile=ccnet_profile)
            ccnet_conf.save()
        return HttpResponse("ok")
    else:
         try:
             ccnet_conf = UserCcnetConf.objects.get(ccnet_user_id=ccnet_id)
             ccnet_profile = ccnet_conf.ccnet_profile
         except UserCcnetConf.DoesNotExist:
             ccnet_profile = ""

    return render_to_response('profile/set_ccnet_conf.html',
                              { 'ccnet_profile': ccnet_profile },
                              context_instance=RequestContext(request))
    
@login_required
def download_profile(request):
    user_id = request.GET.get('user_id', None)
    err_msg = ''
    try:
        profile = ccnet_rpc.get_user_profile(user_id)
    except Exception as e:
        err_msg = str(e)
        profile = None

    if profile:
        response = HttpResponse(profile, content_type='application/txt')
        response['Content-Disposition'] = 'attachment; filename=ccnet.profile'
        return response
    else:
        return HttpResponse("Error: " + err_msg)

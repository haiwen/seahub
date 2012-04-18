from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response, get_object_or_404
from django.template.loader import get_template
from django.template import Context, RequestContext
from django.contrib.auth.decorators import login_required
from django.core.urlresolvers import reverse

import datetime

from forms import SetUserProfileForm
from models import UserCcnetConf

from seaserv import ccnet_rpc, translate_time_usec, get_binding_userids

@login_required
def show_profile(request):
    userid_list = get_binding_userids(request.user.username)

    profile_dict = {}
    
    for user_id in userid_list:
        try:
            profile_timestamp = ccnet_rpc.get_user_profile_timestamp(user_id)
            profile_timestamp = translate_time_usec(profile_timestamp)
        except:
            profile_timestamp = None

        try:
            peernames = ccnet_rpc.get_peernames_by_userid(user_id)
            for peername in peernames.split('\n'):
                if not peername:
                    continue
                profile_dict[peername] = profile_timestamp
        except:
            pass
        
    return render_to_response('profile/profile.html', {
                                'userid_list': userid_list,
                                'profile_dict': profile_dict,
                                },
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
    ccnet_id = request.user.user_id
 
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
    
@login_required
def list_userids(request):
    userid_list = get_binding_userids(request.user.username)

    peer_list = []
    for userid in userid_list:
        try:
            peernames = ccnet_rpc.get_peernames_by_userid(userid)
            for peername in peernames.split('\n'):
                if not peername:
                    continue
                peer_list.append(peername)
        except:
            pass

    return render_to_response('profile/user_ids.html',
                              {'peer_list': peer_list},
                              context_instance=RequestContext(request))

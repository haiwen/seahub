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

    try:
        profile_timestamp = ccnet_rpc.get_user_profile_timestamp(profile.ccnet_user_id)
        profile_timestamp = translate_time_usec(profile_timestamp)
    except:
        profile_timestamp = None
        
    return render_to_response('profile/profile.html', {
                                'userid_list': userid_list,
                                'profile_timestamp': profile_timestamp},
                              context_instance=RequestContext(request))


#@login_required
#def set_profile(request):
#    error_msg = None
#    origin_id = None
#    if request.method == 'POST':
#        ccnet_user_id = request.POST.get('ccnet_user_id', '').strip()
#        origin_id = ccnet_user_id
#        if not ccnet_user_id:
#            error_msg = "You must specify Key ID"
#        elif len(ccnet_user_id) != 40:
#            error_msg = "Key ID must be of length 40"
#        elif ccnet_rpc.get_binding_email(ccnet_user_id) != None:
#            email = ccnet_rpc.get_binding_email(ccnet_user_id)
#            # user id has been binded by an email
#            error_msg = ("Key ID has been used by %s" % email)
#        else:
#            try:
#                ccnet_rpc.add_client(ccnet_user_id)
#            except Exception, e:
#                error_msg = "Ccnet Daemon is not available, try again later"
#            else:
#                ccnet_rpc.add_binding(request.user.username, ccnet_user_id)
#                return HttpResponseRedirect(reverse(show_profile))
#    else:
#        origin_id = ccnet_rpc.get_binding_userid(request.user.username)
# 
#    return render_to_response('profile/set_profile.html',
#                              { 'error_msg': error_msg,
#                                'origin_id': origin_id },
#                              context_instance=RequestContext(request))


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

    return render_to_response('profile/user_ids.html',
                              {'userid_list': userid_list},
                              context_instance=RequestContext(request))

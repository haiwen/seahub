# encoding: utf-8
import simplejson as json
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response, get_object_or_404
from django.template import Context, RequestContext
from django.contrib.auth.decorators import login_required

from seaserv import ccnet_rpc, ccnet_threaded_rpc, get_binding_peerids
from pysearpc import SearpcError

from forms import ProfileForm
from models import Profile
from utils import go_error
from seahub.contacts.models import Contact

#@login_required
#def list_userids(request):
#    peer_list = []
#    try:
#        peers = ccnet_threaded_rpc.get_peers_by_email(request.user.username)
#    except:
#        peers = None
#    
#    return render_to_response('profile/user_ids.html',
#                              {'peers': peers},
#                              context_instance=RequestContext(request))

def logout_relay(request):
    peer_id = request.GET.get('peer_id', '')

    try:
        ccnet_threaded_rpc.remove_one_binding(request.user.username, peer_id)
    except SearpcError, e:
        return go_error(request, e.msg)

    return HttpResponseRedirect(reverse('list_userids'))

@login_required
def edit_profile(request):
    modified = False
    if request.method == 'POST':
        form = ProfileForm(request.POST)
        if form.is_valid():
            modified = True
            nickname = form.cleaned_data['nickname']
            intro = form.cleaned_data['intro']
            try:
                profile = Profile.objects.get(user=request.user.username)
            except Profile.DoesNotExist:
                profile = Profile()
                
            profile.user = request.user.username
            profile.nickname = nickname
            profile.intro = intro
            profile.save()
    else:
        try:
            profile = Profile.objects.get(user=request.user.username)
            form = ProfileForm({
                    'nickname': profile.nickname,
                    'intro': profile.intro,
                    })
        except Profile.DoesNotExist:
            form = ProfileForm()

    return render_to_response('profile/set_profile.html', {
            'form': form,
            'modified': modified,
            }, context_instance=RequestContext(request))

@login_required
def user_profile(request, user):
    user_nickname = ''
    user_intro = ''
    err_msg = ''
    
    try:
        user_check = ccnet_threaded_rpc.get_emailuser(user)
    except:
        user_check = None
        
    if user_check:
        profile = Profile.objects.filter(user=user)
        if profile:
            profile = profile[0]
            user_nickname = profile.nickname
            user_intro = profile.intro
    else:
        err_msg = '该用户不存在'

    if user == request.user.username or \
            Contact.objects.filter(user_email=request.user.username,
                                   contact_email=user).count() > 0:
        new_user = False
    else:
        new_user = True
        
    return render_to_response('profile/user_profile.html', {
                                'email': user,
                                'nickname': user_nickname,
                                'intro': user_intro,
                                'new_user': new_user,
                                'err_msg': err_msg,
                                  },
                              context_instance=RequestContext(request))

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
        user_check = ccnet_threaded_rpc.get_emailuser(user)
    except:
        user_check = None
        
    if user_check:
        profile = Profile.objects.filter(user=user)
        if profile:
            profile = profile[0]
            data['user_nickname'] = profile.nickname
            data['user_intro'] = profile.intro
    else:
        data['err_msg'] = '该用户不存在'

    if user == request.user.username or \
            Contact.objects.filter(user_email=request.user.username,
                                   contact_email=user).count() > 0:
        data['new_user'] = False
    else:
        data['new_user'] = True

    return HttpResponse(json.dumps(data), content_type=content_type)

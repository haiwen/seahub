# encoding: utf-8
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response, get_object_or_404
from django.template import Context, RequestContext
from django.contrib.auth.decorators import login_required

from seaserv import ccnet_rpc, get_binding_peerids
from pysearpc import SearpcError

from utils import go_error
from models import Profile

@login_required
def list_userids(request):
    peer_list = []
    try:
        peers = ccnet_rpc.get_peers_by_email(request.user.username)
    except:
        peers = None
    
    return render_to_response('profile/user_ids.html',
                              {'peers': peers},
                              context_instance=RequestContext(request))

def logout_relay(request):
    peer_id = request.GET.get('peer_id', '')

    try:
        ccnet_rpc.remove_one_binding(request.user.username, peer_id)
    except SearpcError, e:
        return go_error(request, e.msg)

    return HttpResponseRedirect(reverse('list_userids'))

def edit_profile(request):
    profile = Profile.objects.filter(user=request.user.username)
    if not profile:
        Profile.objects.create(user=request.user.username, nickname='', intro='')

    profile = Profile.objects.filter(user=request.user.username)[0]
    if request.method == 'GET':
        modified = False
    
    if request.method == 'POST':
        modified = True
        new_nickname = request.POST.get('nickname', '')
        new_intro = request.POST.get('intro', '')

        if new_nickname != profile.nickname:
            profile.nickname = new_nickname
            profile.save()

        if new_intro != profile.intro:
            profile.intro = new_intro
            profile.save()

    return render_to_response('profile/set_profile.html', {
                                'nickname':profile.nickname,
                                'intro':profile.intro,
                                'modified':modified,
                                  },
                              context_instance=RequestContext(request))

def user_profile(request):
    user = request.GET.get('user', '')
    
    user_nickname = ''
    user_intro = ''
    err_msg = ''

    if user:
        try:
            user_check = ccnet_rpc.get_emailuser(user)
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
    else:
        err_msg = '该用户不存在'
    
    return render_to_response('profile/user_profile.html', {
                                'email': user,
                                'nickname':user_nickname,
                                'intro':user_intro,
                                'err_msg':err_msg,
                                  },
                              context_instance=RequestContext(request))

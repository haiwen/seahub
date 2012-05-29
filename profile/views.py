from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response, get_object_or_404
from django.template import Context, RequestContext
from django.contrib.auth.decorators import login_required

from seaserv import ccnet_rpc, get_binding_peerids
from pysearpc import SearpcError

from utils import go_error

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

    return HttpResponseRedirect(request.META['HTTP_REFERER'])

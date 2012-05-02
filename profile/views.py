from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response, get_object_or_404
from django.template import Context, RequestContext
from django.contrib.auth.decorators import login_required

from seaserv import ccnet_rpc, get_binding_peerids

@login_required
def list_userids(request):
    peer_list = []
    try:
        peers = ccnet_rpc.get_peers_by_email(request.user.username)
        for peer in peers:
            if not peer:
                continue
            peer_list.append(peer.props.name)
    except:
        pass
    
    return render_to_response('profile/user_ids.html',
                              {'peer_list': peer_list},
                              context_instance=RequestContext(request))

from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.core.urlresolvers import reverse
from django.template import RequestContext

from seaserv import cclient, ccnet_rpc, get_groups

def root(request):
    return HttpResponseRedirect(reverse(home))


def home(request):
    return render_to_response('home.html', { 
            }, context_instance=RequestContext(request))


def peers(request):
    peer_type = request.REQUEST.get('type', 'all')
    peer_ids = ccnet_rpc.list_peers()
    peers = []
    for peer_id in peer_ids.split("\n"):
        # too handle the ending '\n'
        if peer_id == '':
            continue
        peer = ccnet_rpc.get_peer(peer_id)
        if peer_type == 'all':
            peers.append(peer)
        if peer_type == 'mypeer':
            if peer.props.role_list.find('MyPeer') != -1:
                peers.append(peer)

    return render_to_response('peers.html', { 
            'peers': peers,
            }, context_instance=RequestContext(request))


def groups(request):
    groups = get_groups()
    return render_to_response('groups.html', { 
            'groups': groups,
            }, context_instance=RequestContext(request))


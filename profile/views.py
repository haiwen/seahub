from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response, get_object_or_404
from django.template import Context, RequestContext
from django.contrib.auth.decorators import login_required

from seaserv import ccnet_rpc, get_binding_userids

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

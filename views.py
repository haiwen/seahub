from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.core.urlresolvers import reverse
from django.template import RequestContext

def root(request):
    return HttpResponseRedirect(reverse(home))

def home(request):
    return render_to_response('home.html', { 
            }, context_instance=RequestContext(request))

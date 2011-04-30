from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response, get_object_or_404
from django.template.loader import get_template
from django.template import Context, RequestContext
from django.contrib.auth.decorators import login_required
from django.core.urlresolvers import reverse

import datetime

from forms import SetUserProfileForm
from models import UserProfile


@login_required
def show_profile(request):
    groups = []
    return render_to_response('profile/profile.html',
                              { 'groups': groups, },
                              context_instance=RequestContext(request))


@login_required
def set_profile(request):
    if request.method == 'POST':
        form = SetUserProfileForm(request.POST)
        if form.is_valid():
            try:
                profile = request.user.get_profile()
            except UserProfile.DoesNotExist:
                profile = UserProfile(user=request.user)
                profile.save()   # save the profile first, otherwise
                                 # status.save() would fail.

            profile.save()
            return HttpResponseRedirect(reverse(show_profile))
    else:
        try:
            profile = request.user.get_profile()
        except UserProfile.DoesNotExist:
            profile = UserProfile(user=request.user)

        profile_form = SetUserProfileForm(profile.__dict__)

    return render_to_response('profile/set_profile.html',
                              { 'profile_form': profile_form, },
                              context_instance=RequestContext(request))


# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from django.urls import reverse
from django.http import HttpResponseRedirect
from django.shortcuts import redirect
from django.views.decorators.cache import never_cache
from django.views.generic import TemplateView, FormView

from seahub.auth.decorators import login_required

from seahub.two_factor.forms import DisableForm
from seahub.two_factor.models import (StaticDevice, devices_for_user,
                                      user_has_device, default_device)
from seahub.two_factor.views.utils import class_view_decorator, CheckTwoFactorEnabledMixin


@class_view_decorator(never_cache)
@class_view_decorator(login_required)
class DisableView(CheckTwoFactorEnabledMixin, FormView):
    """
    View for disabling two-factor for a user's account.
    """
    template_name = 'two_factor/profile/disable.html'
    form_class = DisableForm

    def get(self, request, *args, **kwargs):
        if not user_has_device(self.request.user):
            return HttpResponseRedirect(reverse('edit_profile'))
        return super(DisableView, self).get(request, *args, **kwargs)

    def form_valid(self, form):
        for device in devices_for_user(self.request.user):
            device.delete()

        resp = HttpResponseRedirect(reverse('edit_profile'))
        resp.delete_cookie('S2FA', domain=settings.SESSION_COOKIE_DOMAIN)
        return resp

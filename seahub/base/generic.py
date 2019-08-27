# Copyright (c) 2012-2016 Seafile Ltd.
from django.views.generic import TemplateView

from constance import config

class DirectTemplateView(TemplateView):
    """
    Extend Django ``TemplateView`` to accept extra contexts.
    """

    extra_context = None
    def get_context_data(self, **kwargs):
        context = super(self.__class__, self).get_context_data(**kwargs)
        if self.extra_context is not None:
            for key, value in list(self.extra_context.items()):
                if callable(value):
                    context[key] = value()
                else:
                    context[key] = value

        context['enable_signup'] = config.ENABLE_SIGNUP
        context['send_mail'] = config.REGISTRATION_SEND_MAIL
        return context

# Copyright (c) 2012-2016 Seafile Ltd.
from django.utils.decorators import method_decorator
from seahub.auth.decorators import login_required

# from base.decorators import ctx_switch_required

class LoginRequiredMixin(object):
    """
    View mixin which verifies that the user has authenticated.

    NOTE:
    	This should be the left-most mixin of a view.
    """

    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super(LoginRequiredMixin, self).dispatch(*args, **kwargs)

# class CtxSwitchRequiredMixin(object):
#     @method_decorator(ctx_switch_required)
#     def dispatch(self, *args, **kwargs):
#         return super(CtxSwitchRequiredMixin, self).dispatch(*args, **kwargs)
    

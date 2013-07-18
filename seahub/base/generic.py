from django.views.generic import TemplateView

class DirectTemplateView(TemplateView):
    """
    Extend Django ``TemplateView`` to accept extra contexts.
    """
    extra_context = None
    def get_context_data(self, **kwargs):
        context = super(self.__class__, self).get_context_data(**kwargs)
        if self.extra_context is not None:
            for key, value in self.extra_context.items():
                if callable(value):
                    context[key] = value()
                else:
                    context[key] = value
        return context

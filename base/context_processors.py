"""
A set of request processors that return dictionaries to be merged into a
template context. Each function takes the request object as its only parameter
and returns a dictionary to add to the context.

These are referenced from the setting TEMPLATE_CONTEXT_PROCESSORS and used by
RequestContext.
"""
import settings

def base(request):
    """
    Add seahub base configure to the context.
    
    """
    return {
        'seafile_version': settings.SEAFILE_VERSION,
        'seahub_title': settings.SEAHUB_TITLE,
        'account_type': settings.ACCOUNT_TYPE,
        }

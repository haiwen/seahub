"""
A set of request processors that return dictionaries to be merged into a
template context. Each function takes the request object as its only parameter
and returns a dictionary to add to the context.

These are referenced from the setting TEMPLATE_CONTEXT_PROCESSORS and used by
RequestContext.
"""
from settings import SEAFILE_VERSION, SEAHUB_TITLE, BUSINESS_MODE

def base(request):
    """
    Add seahub base configure to the context.
    
    """
    try:
        org = request.user.org
    except AttributeError:
        org = None
    try:
        base_template = request.base_template
    except AttributeError:
        base_template = 'myhome_base.html'
    return {
        'seafile_version': SEAFILE_VERSION,
        'seahub_title': SEAHUB_TITLE,
        'business_mode': BUSINESS_MODE,
        'cloud_mode': request.cloud_mode,
        'org': org,
        'base_template': base_template,
        }


"""
A set of request processors that return dictionaries to be merged into a
template context. Each function takes the request object as its only parameter
and returns a dictionary to add to the context.

These are referenced from the setting TEMPLATE_CONTEXT_PROCESSORS and used by
RequestContext.
"""
import settings

def version(request):
    """
    Add seafile version to the context.
    
    """
    return {'seafile_version': settings.SEAFILE_VERSION}

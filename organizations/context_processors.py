from seahub.utils import get_cur_ctx

def org(request):
    """
    Add org info and base template that html page will extends to context.
    """
    ctx_dict = get_cur_ctx(request)
    base_template = ctx_dict['base_template']
    org_dict = ctx_dict['org_dict']
    return {'base_template': base_template,
            'org': org_dict}


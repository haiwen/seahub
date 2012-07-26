def org(request):
    """
    Add org info and base template that html page will extends to context.
    """
    if hasattr(request.user, 'org') and request.user.org is not None:
        if request.user.org['is_staff']:
            base_template = 'org_admin_base.html'
        else:
            base_template = 'org_base.html'
        return {'cur_ctx': 'org',
                'org': request.user.org,
                'base_template': base_template}
    else:
        return {'cur_ctx': '',
                'base_template': 'myhome_base.html'}
    

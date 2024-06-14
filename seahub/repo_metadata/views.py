from seahub.views import check_folder_permission
from seaserv import seafile_api
from seahub.auth.decorators import login_required
from seahub.base.decorators import repo_passwd_set_required
from django.http import Http404, HttpResponseBadRequest, HttpResponseForbidden, HttpResponseServerError
from seahub.api2.endpoints.metadata_manage import check_repo_metadata_is_enable, list_metadata_records
from django.shortcuts import render


@login_required
@repo_passwd_set_required
def view_metadata(request, repo_id):
    template = 'metadata_table.html'
    
    # metadata enable check
    if not check_repo_metadata_is_enable(repo_id):
        return HttpResponseBadRequest(f'The metadata module is not enable for repo {repo_id}.')

    # recource check
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    # permission check
    permission = check_folder_permission(request, repo_id, '/')
    if not permission:
        return HttpResponseForbidden('Permission denied.')
    
    try:
        results = list_metadata_records(repo_id, request.user.username)
    except Exception as err:
        return HttpResponseServerError(repr(err))
    
    for result in results:
        #preprocess creator and modifier
        if result['creator'] == '':
            result['creator'] = '-----------'

        if result['modifier'] == '':
            result['modifier'] = '-----------'

        #preprocess _id
        result['id'] = result['_id']
        del result['_id']

    return_dict = {
        'metadata_records': results
    }
    return render(request, template, return_dict)
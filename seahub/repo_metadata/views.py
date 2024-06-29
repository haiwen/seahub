from seahub.views import check_folder_permission
from seaserv import seafile_api
from seahub.auth.decorators import login_required
from seahub.base.decorators import repo_passwd_set_required
from django.http import Http404, HttpResponseBadRequest, HttpResponseForbidden, HttpResponseServerError
from seahub.api2.endpoints.metadata_manage import list_metadata_records
from seahub.repo_metadata.models import RepoMetadata
from django.shortcuts import render


@login_required
@repo_passwd_set_required
def view_metadata(request, repo_id):
    template = 'metadata_table.html'
    
    # metadata enable check
    record = RepoMetadata.objects.filter(repo_id=repo_id).first()
    if not record or not record.enabled:
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

    return_results = []
    
    for result in results:

        result_info = {
            'id': result['_id'],
            'creator': result['_file_creator'],
            'file_ctime': result['_file_ctime'],
            'modifier': result['_file_modifier'],
            'file_mtime': result['_file_mtime'],
            'parent_dir': result['_parent_dir'],
            'name': result['_name'],
            'is_dir': result['_is_dir'],
        }
        return_results.append(result_info)

    return_dict = {
        'metadata_records': return_results
    }

    return render(request, template, return_dict)

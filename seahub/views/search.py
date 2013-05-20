from django.shortcuts import render_to_response
from django.template import RequestContext

from seaserv import get_repo
from seahub.auth.decorators import login_required
from seahub.utils import PREVIEW_FILEEXT
from seahub.utils.search import search_file_by_name, search_repo_file_by_name

@login_required
def search(request):
    template = 'search_results.html'
    error = False

    keyword = request.GET.get('q', None)
    if not keyword:
        return render_to_response(template, {
            'error': True,
            }, context_instance=RequestContext(request))   

    # advanced search
    search_repo = request.GET.get('search_repo', None) # val: 'all' or 'search_repo_id'
    search_ftypes = request.GET.get('search_ftypes', None) # val: 'all' or 'custom'
    custom_ftypes =  request.GET.getlist('ftype') # types like 'Image', 'Video'... same in utils/file_types.py
    input_fileexts = request.GET.get('input_fexts', '') # file extension input by the user

    suffixes = None
    if search_ftypes == 'custom':
        suffixes = []
        if len(custom_ftypes) > 0:
            for ftp in custom_ftypes:
                if PREVIEW_FILEEXT.has_key(ftp):
                    for ext in PREVIEW_FILEEXT[ftp]:
                        suffixes.append(ext)

        if input_fileexts:
            input_fexts = input_fileexts.split(',')
            for i_ext in input_fexts:
                i_ext = i_ext.strip()
                if i_ext:
                    suffixes.append(i_ext)

    current_page = int(request.GET.get('page', '1'))
    per_page= int(request.GET.get('per_page', '25'))

    start = (current_page - 1) * per_page
    size = per_page

    repo = None
    if search_repo and search_repo != 'all':
        repo_id = search_repo
        repo = get_repo(repo_id)
        if repo:
            results, total = search_repo_file_by_name(request, repo, keyword, suffixes, start, size)
        else:
            results, total = [], 0
    else:
        results, total = search_file_by_name(request, keyword, suffixes, start, size)

    if total > current_page * per_page:
        has_more = True
    else:
        has_more = False

    return render_to_response(template, {
            'repo': repo,
            'keyword': keyword,
            'results': results,
            'total': total,
            'has_more': has_more,
            'current_page': current_page,
            'prev_page': current_page - 1,
            'next_page': current_page + 1,
            'per_page': per_page,
            'search_repo': search_repo,
            'search_ftypes': search_ftypes,
            'custom_ftypes': custom_ftypes,
            'input_fileexts': input_fileexts,
            'error': error,
            }, context_instance=RequestContext(request))

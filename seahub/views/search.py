from django.shortcuts import render_to_response
from django.template import RequestContext

from seaserv import get_repo
from seahub.auth.decorators import login_required
from seahub.utils.search import search_file_by_name, search_repo_file_by_name


def parse_suffixes(suffixes):
    if not suffixes:
        return None

    l = []
    for suffix in suffixes.split(','):
        suffix = suffix.strip()
        if suffix:
            l.append(suffix)

    print l

    return l

@login_required
def search(request):
    keyword = request.GET['q']
    suffixes = parse_suffixes(request.GET.get('suffixes', None))

    current_page = int(request.GET.get('page', '1'))
    per_page= int(request.GET.get('per_page', '25'))

    start = (current_page - 1) * per_page
    size = per_page

    scale = request.GET.get('scale', None)
    repo_id = request.GET.get('search_repo_id', None)
    repo = None
    if scale == 'current' and repo_id:
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

    return render_to_response('search_results.html', {
            'repo': repo,
            'keyword': keyword,
            'results': results,
            'total': total,
            'has_more': has_more,
            'current_page': current_page,
            'prev_page': current_page - 1,
            'next_page': current_page + 1,
            'per_page': per_page,
            }, context_instance=RequestContext(request))

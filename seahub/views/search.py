from django.shortcuts import render_to_response
from django.template import RequestContext

from seahub.auth.decorators import login_required
from seahub.utils.search import search_file_by_name

@login_required
def search(request):
    keyword = request.GET['q']
    current_page = int(request.GET.get('page', '1'))
    per_page= int(request.GET.get('per_page', '25'))

    start = (current_page - 1) * per_page
    size = per_page
    results, total = search_file_by_name(request, keyword, start, size)

    if total > current_page * per_page:
        has_more = True
    else:
        has_more = False

    return render_to_response('search_results.html', {
            'keyword': keyword,
            'results': results,
            'total': total,
            'has_more': has_more,
            'current_page': current_page,
            'prev_page': current_page - 1,
            'next_page': current_page + 1,
            'per_page': per_page,
            }, context_instance=RequestContext(request))

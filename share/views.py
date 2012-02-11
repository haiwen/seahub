from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.contrib.auth.decorators import login_required

from forms import UserShareForm
from models import UserShare


@login_required
def list_shared_repos(request):
    """Show the repos I shared."""

    share_items = UserShare.objects.filter(from_user=request.user)
    share2me_items = UserShare.objects.filter(to_user=request.user)
    #for repo in s_repos:
    #    s_repos
    #    pass
    return render_to_response("repo/shared_repo_list.html",
                              { 'share_items': share_items,
                                "share2me_items": share2me_items },
                              context_instance=RequestContext(request))

@login_required
def share_repo(request):
    """Share a repo to a user."""

    if request.method == 'POST':
        form = UserShareForm(request.POST)
        if form.is_valid():
            repo_share = UserShare()
            repo_share.from_user = request.user
            repo_share.to_user = form.to_user
            repo_share.repo_id = form.cleaned_data['repo_id']
            try:
                repo_share.save()
            except IntegrityError:
                # catch the case repo added to group before
                pass
            return HttpResponseRedirect(reverse('shared_repo_list', args=[]))
    else:
        user_email = request.REQUEST.get('user_email', '')
        repo_id = request.REQUEST.get('repo_id', '')
        form = UserShareForm(initial={'user_email': user_email, 'repo_id': repo_id})
    
    return render_to_response("repo/share_repo.html",  {
            'form': form, 
            }, context_instance=RequestContext(request))


@login_required
def delete_share_item(request, item_id):
    """Delete a share item."""

    try:
        item = UserShare.objects.get(pk=item_id)
        item.delete()
    except UserShare.DoesNotExist:
        pass

    return HttpResponseRedirect(request.META['HTTP_REFERER'])
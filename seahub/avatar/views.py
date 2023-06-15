# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
from django.core.cache import cache
from django.http import HttpResponseRedirect, Http404
from django.shortcuts import render
from django.utils.translation import gettext as _
from django.conf import settings
from django.contrib import messages

from seahub.avatar.forms import PrimaryAvatarForm, DeleteAvatarForm, UploadAvatarForm,\
    GroupAvatarForm
from seahub.avatar.models import Avatar, GroupAvatar
from seahub.avatar.settings import AVATAR_MAX_AVATARS_PER_USER, AVATAR_DEFAULT_SIZE
from seahub.avatar.signals import avatar_updated
from seahub.avatar.util import get_primary_avatar, get_default_avatar_url, \
    invalidate_cache, invalidate_group_cache
from seahub.utils import render_error, render_permission_error

from seahub.auth.decorators import login_required
from seaserv import ccnet_threaded_rpc, check_group_staff

def _get_next(request):
    """
    The part that's the least straightforward about views in this module is how they
    determine their redirects after they have finished computation.

    In short, they will try and determine the next place to go in the following order:

    1. If there is a variable named ``next`` in the *POST* parameters, the view will
    redirect to that variable's value.
    2. If there is a variable named ``next`` in the *GET* parameters, the view will
    redirect to that variable's value.
    3. If Django can determine the previous page from the HTTP headers, the view will
    redirect to that previous page.
    """
    next_page = request.POST.get('next', request.GET.get('next',
        request.headers.get('referer', None)))
    if not next_page:
        next_page = request.path
    return next_page

def _get_avatars(user):
    # Default set. Needs to be sliced, but that's it. Keep the natural order.
    avatars = Avatar.objects.filter(emailuser=user.email)

    # Current avatar
    primary_avatar = avatars.order_by('-primary')[:1]
    if primary_avatar:
        avatar = primary_avatar[0]
    else:
        avatar = None

    if AVATAR_MAX_AVATARS_PER_USER == 1:
        avatars = primary_avatar
    else:
        # Slice the default set now that we used the queryset for the primary avatar
        avatars = avatars[:AVATAR_MAX_AVATARS_PER_USER]
    return (avatar, avatars)

@login_required
def add(request, extra_context=None, next_override=None,
        upload_form=UploadAvatarForm, *args, **kwargs):
    if extra_context is None:
        extra_context = {}
    avatar, avatars = _get_avatars(request.user)
    upload_avatar_form = upload_form(request.POST or None,
        request.FILES or None, user=request.user)
    if request.method == "POST" and 'avatar' in request.FILES:
        if upload_avatar_form.is_valid():
            avatar = Avatar(
                emailuser = request.user.username,
                primary = True,
            )
            image_file = request.FILES['avatar']
            avatar.avatar.save(image_file.name, image_file)
            avatar.save()
            messages.success(request, _("Successfully uploaded a new avatar."))
            avatar_updated.send(sender=Avatar, user=request.user, avatar=avatar)
            return HttpResponseRedirect(next_override or _get_next(request))
        else:
            messages.error(request, upload_avatar_form.errors['avatar'])

        return HttpResponseRedirect(_get_next(request))
    else:
        # Only allow post request to change avatar.
        raise Http404


@login_required
def change(request, extra_context=None, next_override=None,
        upload_form=UploadAvatarForm, primary_form=PrimaryAvatarForm,
        *args, **kwargs):
    if extra_context is None:
        extra_context = {}
    avatar, avatars = _get_avatars(request.user)
    if avatar:
        kwargs = {'initial': {'choice': avatar.id}}
    else:
        kwargs = {}
    upload_avatar_form = upload_form(user=request.user, **kwargs)
    primary_avatar_form = primary_form(request.POST or None,
        user=request.user, avatars=avatars, **kwargs)
    if request.method == "POST":
        updated = False
        if 'choice' in request.POST and primary_avatar_form.is_valid():
            avatar = Avatar.objects.get(id=
                primary_avatar_form.cleaned_data['choice'])
            avatar.primary = True
            avatar.save()
            updated = True
            messages.success(request, _("Successfully updated your avatar."))
        if updated:
            avatar_updated.send(sender=Avatar, user=request.user, avatar=avatar)
        return HttpResponseRedirect(next_override or _get_next(request))
    return render(
        request,
        'avatar/change.html',
        extra_context.update({
            'avatar': avatar,
            'avatars': avatars,
            'upload_avatar_form': upload_avatar_form,
            'primary_avatar_form': primary_avatar_form,
            'next': next_override or _get_next(request), }),
    )

@login_required
def delete(request, extra_context=None, next_override=None, *args, **kwargs):
    if extra_context is None:
        extra_context = {}
    avatar, avatars = _get_avatars(request.user)
    delete_avatar_form = DeleteAvatarForm(request.POST or None,
        user=request.user, avatars=avatars)
    if request.method == 'POST':
        if delete_avatar_form.is_valid():
            ids = delete_avatar_form.cleaned_data['choices']
            if str(avatar.id) in ids and avatars.count() > len(ids):
                # Find the next best avatar, and set it as the new primary
                for a in avatars:
                    if str(a.id) not in ids:
                        a.primary = True
                        a.save()
                        avatar_updated.send(sender=Avatar, user=request.user, avatar=avatar)
                        break

            # NOTE: `Avatar.objects.filter(id__in=ids).delete()` will NOT work
            # correctly. Sinct delete() on QuerySet will not call delete
            # method on avatar object.
            for a in Avatar.objects.filter(id__in=ids):
                a.delete()

            messages.success(request, _("Successfully deleted the requested avatars."))
            return HttpResponseRedirect(next_override or _get_next(request))
    return render(
        request,
        'avatar/confirm_delete.html',
        extra_context.update({
            'avatar': avatar,
            'avatars': avatars,
            'delete_avatar_form': delete_avatar_form,
            'next': next_override or _get_next(request), }),
    )

def render_primary(request, extra_context={}, user=None, size=AVATAR_DEFAULT_SIZE, *args, **kwargs):
    size = int(size)
    avatar = get_primary_avatar(user, size=size)
    if avatar:
        # FIXME: later, add an option to render the resized avatar dynamically
        # instead of redirecting to an already created static file. This could
        # be useful in certain situations, particulary if there is a CDN and
        # we want to minimize the storage usage on our static server, letting
        # the CDN store those files instead
        return HttpResponseRedirect(avatar.avatar_url(size))
    else:
        url = get_default_avatar_url()
        return HttpResponseRedirect(url)

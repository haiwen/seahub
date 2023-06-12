# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import logging
import json
from django.http import HttpResponse, HttpResponseBadRequest, \
    HttpResponseRedirect
from django.shortcuts import render, Http404
from django.urls import reverse

from django.core.exceptions import ObjectDoesNotExist
from django.forms.models import modelformset_factory
from django.contrib import messages
from django.utils.translation import gettext as _

from .models import Contact, ContactAddForm, ContactEditForm
from seahub.auth.decorators import login_required, login_required_ajax
from seahub.profile.models import Profile
from seahub.utils import render_error, is_valid_email
from seahub.views import is_registered_user
from seahub.settings import SITE_ROOT

# Get an instance of a logger
logger = logging.getLogger(__name__)

@login_required
def contact_list(request):
    contacts = Contact.objects.filter(user_email=request.user.username)
    contacts_emails = [x.contact_email for x in contacts]
    contacts_profiles = Profile.objects.filter(user__in=contacts_emails)

    for c in contacts:
        for c_p in contacts_profiles:
            if c.contact_email == c_p.user:
                c.profile = c_p
                break

    # form = ContactAddForm({'user_email':request.user.username})
    # edit_init_data = {'user_email':request.user.username,
    #                   'contact_email':'',
    #                   'contact_name':'',
    #                   'note':''}
    # edit_form = ContactEditForm(edit_init_data)

    return render(request, 'contacts/contact_list.html', {
        'contacts': contacts,
        # 'form': form,
        # 'edit_form': edit_form,
        })

@login_required_ajax
def contact_add(request):
    """
    Handle ajax post to add a contact.
    """
    if request.method != 'POST':
        raise Http404

    result = {}
    content_type = 'application/json; charset=utf-8'

    username = request.user.username
    contact_email = request.POST.get('contact_email', '')
    if not is_valid_email(contact_email):
        result['success'] = False
        messages.error(request, _("%s is not a valid email.") % contact_email)
        return HttpResponseBadRequest(json.dumps(result), content_type=content_type)

    if Contact.objects.get_contact_by_user(username, contact_email) is not None:
        result['success'] = False
        messages.error(request, _("%s is already in your contacts.") % contact_email)
        return HttpResponseBadRequest(json.dumps(result), content_type=content_type)

    contact_name = request.POST.get('contact_name', '')
    note = request.POST.get('note', '')

    try:
        Contact.objects.add_contact(username, contact_email, contact_name, note)
        result['success'] = True
        messages.success(request, _("Successfully added %s to contacts.") % contact_email)
        return HttpResponse(json.dumps(result), content_type=content_type)
    except Exception as e:
        logger.error(e)
        result['success'] = False
        messages.error(request, _("Failed to add %s to contacts.") % contact_email)
        return HttpResponse(json.dumps(result), status=500, content_type=content_type)

@login_required_ajax
def contact_edit(request):
    """
    Ajax post to edit contact info.
    """
    result = {}
    content_type = 'application/json; charset=utf-8'
    form = ContactEditForm(request.POST)
    if form.is_valid():
        user_email = form.cleaned_data['user_email']
        contact_email = form.cleaned_data['contact_email']
        contact_name = form.cleaned_data['contact_name']
        note = form.cleaned_data['note']
        contact = Contact.objects.get(user_email=user_email, contact_email=contact_email)
        contact.contact_name = contact_name
        contact.note = note
        contact.save()
        result['success'] = True
        messages.success(request, _('Successfully edited %s.') % contact_email)
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)
       
        
@login_required
def contact_delete(request):
    user_email = request.user.username
    contact_email = request.GET.get('email')

    Contact.objects.filter(user_email=user_email, contact_email=contact_email).delete()
    messages.success(request, _('Successfully Deleted %s') % contact_email)
    
    return HttpResponseRedirect(reverse("contact_list"))

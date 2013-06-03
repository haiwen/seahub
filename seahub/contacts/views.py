# encoding: utf-8
import simplejson as json
from django.http import HttpResponse, HttpResponseBadRequest, \
    HttpResponseRedirect
from django.shortcuts import render_to_response, Http404
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.core.exceptions import ObjectDoesNotExist
from django.forms.models import modelformset_factory
from django.contrib import messages
from django.utils.translation import ugettext as _

from models import Contact, ContactAddForm, ContactEditForm
from seahub.auth.decorators import login_required
from seahub.utils import render_error
from seaserv import ccnet_rpc, ccnet_threaded_rpc
from seahub.views import is_registered_user
from seahub.settings import SITE_ROOT

@login_required
def contact_list(request):
    contacts = Contact.objects.filter(user_email=request.user.username)
    # registered_contacts = []
    # unregistered_contacts = []
    # for c in contacts:
    #     if is_registered_user(c.contact_email):
    #         registered_contacts.append(c)
    #     else:
    #         unregistered_contacts.append(c)

    form = ContactAddForm({'user_email':request.user.username})
    edit_init_data = {'user_email':request.user.username,
                      'contact_email':'',
                      'contact_name':'',
                      'note':''}
    edit_form = ContactEditForm(edit_init_data)

    return render_to_response('contacts/contact_list.html', {
        'contacts': contacts,
        # 'registered_contacts': registered_contacts,
        # 'unregistered_contacts': unregistered_contacts,
        'form': form,
        'edit_form': edit_form,
        }, context_instance=RequestContext(request))


@login_required
def contact_add_post(request):
    """
    Handle ajax post to add a contact.
    """
    result = {}
    content_type = 'application/json; charset=utf-8'

    form = ContactAddForm(request.POST)
    if form.is_valid():
        contact_email = form.cleaned_data['contact_email']
        
        contact = Contact()
        contact.user_email = form.cleaned_data['user_email']
        contact.contact_email = contact_email
        contact.contact_name = form.cleaned_data['contact_name']
        contact.note = form.cleaned_data['note']
        contact.save()

        result['success'] = True
        messages.success(request, _(u"Successfully added %s to contacts.") % contact_email)
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)
    
@login_required
def contact_add(request):
    """
    Handle normal request to add a contact.
    """
    if request.method != 'POST':
        raise Http404
    
    form = ContactAddForm(request.POST)
    if form.is_valid():
        contact_email = form.cleaned_data['contact_email']
        
        contact = Contact()
        contact.user_email = form.cleaned_data['user_email']
        contact.contact_email = contact_email
        contact.contact_name = form.cleaned_data['contact_name']
        contact.note = form.cleaned_data['note']
        contact.save()
            
        messages.success(request, _(u"Successfully added %s to contacts.") % contact_email)
    else:
        messages.error(request, _('Failed to add %s to contacts.'))
    
    referer = request.META.get('HTTP_REFERER', None)
    if not referer:
        referer = SITE_ROOT
    return HttpResponseRedirect(referer)

@login_required
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
        messages.success(request, _(u'Successfully edited %s.') % contact_email)
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)
       
        
@login_required
def contact_delete(request):
    user_email = request.user.username
    contact_email = request.GET.get('email')

    Contact.objects.filter(user_email=user_email, contact_email=contact_email).delete()
    messages.success(request, _(u'Successfully Deleted %s') % contact_email)
    
    return HttpResponseRedirect(reverse("contact_list"))

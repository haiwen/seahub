# encoding: utf-8
import simplejson as json
from django.http import HttpResponse, HttpResponseBadRequest, \
    HttpResponseRedirect
from django.shortcuts import render_to_response, Http404
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist
from django.forms.models import modelformset_factory
from django.contrib import messages

from models import Contact, ContactAddForm, ContactEditForm
from utils import render_error

from seaserv import ccnet_rpc, ccnet_threaded_rpc

@login_required
def contact_list(request):
    contacts = Contact.objects.filter(user_email=request.user.username)
    form = ContactAddForm({'user_email':request.user.username})
    return render_to_response('contacts/contact_list.html', {
        'contacts': contacts,
        'form': form,
        }, context_instance=RequestContext(request))


@login_required
def contact_add_post(request):
    """
    Handle ajax post to add a contact.
    """

    if not request.is_ajax() and not request.method == 'POST':
        raise Http404

    result = {}
    content_type = 'application/json; charset=utf-8'

    form = ContactAddForm(request.POST)
    if form.is_valid():
        contact = Contact()
        contact.user_email = form.cleaned_data['user_email']
        contact.contact_email = form.cleaned_data['contact_email']
        contact.contact_name = form.cleaned_data['contact_name']
        contact.note = form.cleaned_data['note']
        contact.save()

        result['success'] = True
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
    
    group_id = request.GET.get('group_id', '0')
    try:
        group_id_int = int(group_id)
    except ValueError:
        return render_error('小组ID必须为整数')
        
    form = ContactAddForm(request.POST)
    if form.is_valid():
        contact_email = form.cleaned_data['contact_email']
        
        contact = Contact()
        contact.user_email = form.cleaned_data['user_email']
        contact.contact_email = contact_email
        contact.contact_name = form.cleaned_data['contact_name']
        contact.note = form.cleaned_data['note']
        contact.save()
            
        messages.success(request, u"您已成功添加 %s 为联系人" % contact_email)
    else:
        messages.error(request, '操作失败')
    return HttpResponseRedirect(reverse("group_info", args=(group_id,)))

@login_required
def contact_edit(request):
    """
    Edit contact info.
    """
    
    if request.method == 'POST':
        form = ContactEditForm(request.POST)
        if form.is_valid():
            user_email = form.cleaned_data['user_email']
            contact_email = form.cleaned_data['contact_email']
            contact_name = form.cleaned_data['contact_name']
            note = form.cleaned_data['note']
            try:
                contact = Contact.objects.get(user_email=user_email,
                                              contact_email=contact_email)
            except Contact.DoesNotExist:
                return render_error(request, '联系人不存在')
            else:
                contact.contact_name = contact_name
                contact.note = note
                contact.save()
                return HttpResponseRedirect(reverse('contact_list'))
    else:
        contact_email = request.GET.get('email', '')
        c = Contact.objects.filter(user_email=request.user.username,
                                   contact_email=contact_email)
        if not c:
            return render_error(request, '联系人不存在')
        else:
            init_data = {'user_email':request.user.username,
                         'contact_email':contact_email,
                         'contact_name':c.get().contact_name,
                         'note':c.get().note}
            form = ContactEditForm(init_data)
        
    return render_to_response('contacts/contact_edit.html', {
            'form': form,
            }, context_instance=RequestContext(request))
        
        
@login_required
def contact_delete(request):
    user_email = request.user.username
    contact_email = request.GET.get('email')

    Contact.objects.filter(user_email=user_email, contact_email=contact_email).delete()
    
    return HttpResponseRedirect(reverse("contact_list"))

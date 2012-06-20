# encoding: utf-8
from django.http import HttpResponseRedirect
from django.shortcuts import render_to_response, Http404
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist
from django.forms.models import modelformset_factory

from models import Contact
from models import AddContactForm

from seaserv import ccnet_rpc

@login_required
def contact_list(request):
    contacts = Contact.objects.filter(user_email=request.user.username)
    return render_to_response('contacts/contact_list.html', {
        'contacts': contacts,
        }, context_instance=RequestContext(request))


@login_required
def contact_add(request):
    error_msg = None
    if request.method == 'POST':
        form = AddContactForm(request.POST)
        if form.is_valid():
            contact_email = form.cleaned_data['contact_email']
            contact_name = form.cleaned_data['contact_name']
            note = form.cleaned_data['note']
            emailuser = ccnet_rpc.get_emailuser(contact_email)
            if not emailuser:
                error_msg = u"用户不存在"
            elif contact_email == request.user.username:
                error_msg = u"不能添加自己为联系人"
            elif Contact.objects.filter(user_email=request.user.username,
                                        contact_email=contact_email).count() > 0:
                error_msg = u"联系人列表中已有该用户"
            elif request.user.org and \
                not ccnet_rpc.org_user_exists(request.user.org.org_id,
                                              contact_email):
                error_msg = u"当前企业不存在该用户"
            else:
                contact = Contact()
                contact.user_email = request.user.username
                contact.contact_email = contact_email
                contact.contact_name = contact_name
                contact.note = note
                contact.save()
                return HttpResponseRedirect(reverse("contact_list"))
    else:
        form = AddContactForm({'user_email':request.user.username})
    return render_to_response('contacts/contact_add.html', {
        'form': form,
        'error_msg':error_msg,
        'user_email': request.user.username,
        }, context_instance=RequestContext(request))

@login_required
def contact_edit(request):
    error_msg = None
    contact_id = None
    old_contact_email = None
    if request.method == 'POST':
        form = AddContactForm(request.POST)
        if form.is_valid():
            contact_id = request.POST.get('contact_id')
            old_contact_email = request.POST.get('old_contact_email')
            contact_email = form.cleaned_data['contact_email']
            contact_name = form.cleaned_data['contact_name']
            note = form.cleaned_data['note']
            emailuser = ccnet_rpc.get_emailuser(contact_email)
            if not emailuser:
                error_msg = u"用户不存在"
            elif contact_email == request.user.username:
                error_msg = u"不能添加自己为联系人"
            elif old_contact_email != contact_email and \
                    Contact.objects.filter(user_email=request.user.username,
                                           contact_email=contact_email).count() > 0:
                error_msg = u"联系人列表中已有该用户"
            else:
                contact = Contact(id=contact_id)
                contact.user_email = request.user.username
                contact.contact_email = contact_email
                contact.contact_name = contact_name
                contact.note = note
                contact.save()
                return HttpResponseRedirect(reverse("contact_list"))
        
    else:
        contact_email = request.GET.get('email')
        c = Contact.objects.filter(user_email=request.user.username,
                                   contact_email=contact_email)
        if not c:
            error_msg = u'用户不存在'
            form = AddContactForm({'contact_email': contact_email})
        else:
            init_data = {'user_email':request.user.username,
                         'contact_email':contact_email,
                         'contact_name':c.get().contact_name,
                         'note':c.get().note}
            contact_id = c.get().id
            old_contact_email = c.get().contact_email
            form = AddContactForm(init_data)

    return render_to_response('contacts/contact_edit.html', {
            'form': form,
            'error_msg': error_msg,
            'contact_id': contact_id,
            'old_contact_email': old_contact_email,
            }, context_instance=RequestContext(request))
        
        
@login_required
def contact_delete(request):
    user_email = request.user.username
    contact_email = request.GET.get('email')

    Contact.objects.filter(user_email=user_email, contact_email=contact_email).delete()
    
    return HttpResponseRedirect(reverse("contact_list"))

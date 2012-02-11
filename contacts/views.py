from django.http import HttpResponseRedirect
from django.shortcuts import render_to_response
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist

from models import Contact
from forms import AddContactForm

@login_required
def contact_list(request):
    contacts = Contact.objects.filter(owner=request.user)
    return render_to_response('contacts/contact_list.html', {
        'contacts': contacts,
        }, context_instance=RequestContext(request))


@login_required
def contact_add(request):
    error_msg = None
    if request.method == 'POST':
        form = AddContactForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            try:
                user = User.objects.get(email=email)
                contact = Contact()
                contact.owner = request.user
                contact.user = user
                contact.save()
                return HttpResponseRedirect(reverse("contact_list"))
            except ObjectDoesNotExist:
                error_msg = "No user with email \"%s\"" % (email)
    else:
        form = AddContactForm()
    return render_to_response('contacts/contact_add.html', {
        'form': form,
        }, context_instance=RequestContext(request))


@login_required
def contact_delete(request):
    return HttpResponseRedirect(request.META['HTTP_REFERER'])
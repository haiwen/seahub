# encoding: utf-8
from django import forms
from django.db import models
from django.forms import ModelForm
from django.utils.translation import ugettext as _

from settings import CONTACT_EMAIL_LENGTH

class Contact(models.Model):
    """Record user's contacts."""

    user_email = models.CharField(max_length=CONTACT_EMAIL_LENGTH)
    contact_email = models.CharField(max_length=CONTACT_EMAIL_LENGTH)
    contact_name = models.CharField(max_length=255, blank=True, null=True, \
                                        default='')
    note = models.CharField(max_length=255, blank=True, null=True, default='')

    class Meta:
        unique_together = ("user_email", "contact_email")

class ContactAddForm(ModelForm):
    class Meta:
        model = Contact

    def clean(self):
        if not 'contact_email' in self.cleaned_data:
            raise forms.ValidationError(_('Email is required.'))
            
        user_email = self.cleaned_data['user_email']
        contact_email = self.cleaned_data['contact_email']
        if user_email == contact_email:
            raise forms.ValidationError(_("You can't add yourself."))
        elif Contact.objects.filter(user_email=user_email,
                                    contact_email=contact_email).count() > 0:
            raise forms.ValidationError(_("It is already your contact."))
        else:
            return self.cleaned_data

class ContactEditForm(ModelForm):
    class Meta:
        model = Contact
    
    def __init__(self, *args, **kwargs):
        super(ContactEditForm, self).__init__(*args, **kwargs)
        self.fields['contact_email'].widget.attrs['readonly'] = True

    def clean(self):
        # This is used to override unique index check
        return self.cleaned_data

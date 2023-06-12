# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
from django import forms
from django.db import models
from django.forms import ModelForm
from django.utils.translation import gettext as _
from django.core.exceptions import MultipleObjectsReturned

from seaserv import ccnet_threaded_rpc

from seahub.base.fields import LowerCaseCharField
from .settings import CONTACT_EMAIL_LENGTH

class ContactManager(models.Manager):
    def add_contact(self, user_email, contact_email, contact_name=None, note=None):
        contact = self.model(user_email=user_email,
                             contact_email=contact_email,
                             contact_name=contact_name, note=note)
        contact.save(using=self._db)
        return contact
        
    def get_contacts_by_user(self, user_email):
        """Get a user's contacts.
        """
        return super(ContactManager, self).filter(user_email=user_email)

    def get_contact_by_user(self, user_email, contact_email):
        """Return a certern contact of ``user_email``.
        """
        try:
            c = super(ContactManager, self).get(user_email=user_email,
                                                contact_email=contact_email)
        except Contact.DoesNotExist:
            c = None
        except MultipleObjectsReturned:
            c = super(ContactManager, self).filter(user_email=user_email,
                                                contact_email=contact_email)[0]
        return c

    # def get_registered_contacts_by_user(self, user_email):
    #     """Get a user's registered contacts.

    #     Returns:
    #         A list contains the contacts.
    #     """
    #     contacts = [ c.contact_email for c in super(
    #             ContactManager, self).filter(user_email=user_email) ]
    #     emailusers = ccnet_threaded_rpc.filter_emailusers_by_emails(
    #         ','.join(contacts))

    #     return [ Contact(user_email=user_email, contact_email=e.email) \
    #                  for e in emailusers ]

class Contact(models.Model):
    """Record user's contacts."""

    user_email = LowerCaseCharField(max_length=CONTACT_EMAIL_LENGTH, db_index=True)
    contact_email = LowerCaseCharField(max_length=CONTACT_EMAIL_LENGTH)
    contact_name = models.CharField(max_length=255, blank=True, null=True, \
                                        default='')
    note = models.CharField(max_length=255, blank=True, null=True, default='')

    objects = ContactManager()

    def __unicode__(self):
        return self.contact_email
        
    # class Meta:
    #     unique_together = ("user_email", "contact_email")

class ContactAddForm(ModelForm):
    class Meta:
        model = Contact
        fields = "__all__"

    def clean(self):
        if not 'contact_email' in self.cleaned_data:
            raise forms.ValidationError(_('Email is required.'))
        else:
            return self.cleaned_data

class ContactEditForm(ModelForm):
    class Meta:
        model = Contact
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super(ContactEditForm, self).__init__(*args, **kwargs)
        self.fields['contact_email'].widget.attrs['readonly'] = True

    def clean(self):
        # This is used to override unique index check
        return self.cleaned_data

########## handle signals
from django.dispatch import receiver
from .signals import mail_sended

@receiver(mail_sended)
def mail_sended_cb(sender, **kwargs):
    """
    Callback function to add email to contacts.
    """
    user = kwargs['user']
    email = kwargs['email']

    try:
        Contact.objects.get(user_email=user, contact_email=email)
        # Already in contacts list, pass.
    except Contact.DoesNotExist:
        # Add new contact
        c = Contact(user_email=user, contact_email=email)
        c.save()

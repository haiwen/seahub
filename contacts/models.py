from django.db import models
from django.forms import ModelForm

class Contact(models.Model):
    """Record user's contacts."""

    user_email = models.CharField(max_length=255)
    contact_email = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=255, blank=True, null=True)
    note = models.CharField(max_length=255, blank=True, null=True)

class AddContactForm(ModelForm):
    class Meta:
        model = Contact

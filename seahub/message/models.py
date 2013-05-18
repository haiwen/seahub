import datetime
from django import forms
from django.db import models
from django.forms import ModelForm
from django.utils.translation import ugettext as _


class UserMessage(models.Model):
    message_id = models.AutoField(primary_key=True)
    message    = models.CharField(max_length=512)
    from_email = models.EmailField(db_index=True)
    to_email   = models.EmailField(db_index=True)
    timestamp  = models.DateTimeField(default=datetime.datetime.now)
    ifread     = models.BooleanField()

class MessageAddForm(ModelForm):
    from_email = forms.EmailField()
    to_email   = forms.EmailField()


    def clean(self):
        if not 'to_email' in self.cleaned_data:
            raise forms.ValidationError(_('Email is required.'))
            
        from_email = self.cleaned_data['from_email']
        to_email = self.cleaned_data['to_email']

        if to_email == from_email:
            raise forms.ValidationError(_("You can't send to yourself."))
        else:
            return self.cleaned_data
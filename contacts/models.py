# encoding: utf-8
from django import forms
from django.db import models
from django.forms import ModelForm

class Contact(models.Model):
    """Record user's contacts."""

    user_email = models.CharField(max_length=255)
    contact_email = models.CharField(max_length=255)
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
            raise forms.ValidationError('请输入邮箱地址。')
            
        user_email = self.cleaned_data['user_email']
        contact_email = self.cleaned_data['contact_email']
        if user_email == contact_email:
            raise forms.ValidationError('不能添加自己为联系人')
        elif Contact.objects.filter(user_email=user_email,
                                    contact_email=contact_email).count() > 0:
            raise forms.ValidationError('联系人列表中已有该用户')
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

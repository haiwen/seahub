# encoding: utf-8
from django import forms
from django.utils.translation import ugettext_lazy as _

class ProfileForm(forms.Form):
    nickname = forms.CharField(max_length=64, required=False)
    intro = forms.CharField(max_length=256, required=False)


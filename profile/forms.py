# encoding: utf-8
from django import forms
from django.utils.translation import ugettext_lazy as _

from seahub.utils import validate_group_name

class ProfileForm(forms.Form):
    nickname = forms.CharField(max_length=64, required=False)
    intro = forms.CharField(max_length=256, required=False)

    def clean_nickname(self):
        nickname = self.cleaned_data['nickname']
        if validate_group_name(nickname):
            return nickname
        else:
            raise forms.ValidationError(_(u'Nickname can only contain characters, numbers or underscore.'))

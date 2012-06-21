# encoding: utf-8
from django import forms

from seahub.utils import validate_group_name

class ProfileForm(forms.Form):
    nickname = forms.CharField(max_length=64)
    intro = forms.CharField(max_length=256)

    def clean_nickname(self):
        nickname = self.cleaned_data['nickname']
        if validate_group_name(nickname):
            return nickname
        else:
            raise forms.ValidationError(u'昵称只能包含中英文字符、数字及下划线')

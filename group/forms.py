# encoding: utf-8
import os

from django import forms

from seahub.utils import validate_group_name

class MessageForm(forms.Form):
    message = forms.CharField(max_length=500)

class MessageReplyForm(forms.Form):
    message = forms.CharField(max_length=150)

class GroupRecommendForm(MessageForm):
    """
    A form used to recommend a file or directory.
    """
    groups = forms.CharField()
    repo_id = forms.CharField(max_length=40)
    path = forms.CharField()
    attach_type = forms.CharField(max_length=5)

class GroupAddForm(forms.Form):
    """
    A form used to add a new group.
    """
    group_name = forms.CharField(max_length=255, error_messages={
            'required': u'小组名称不能为空',
            'max_length': u'小组名称太长，不超过255个字符',
            })
    def clean_group_name(self):
        group_name = self.cleaned_data['group_name']
        if not validate_group_name(group_name):
            error_msg = u'小组名称只能包含中英文字符，数字及下划线。'
            raise forms.ValidationError(error_msg)
        else:
            return group_name

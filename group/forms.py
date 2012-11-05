# encoding: utf-8
import os

from django import forms

from django.utils.translation import ugettext_lazy as _
from seahub.utils import validate_group_name

class MessageForm(forms.Form):
    message = forms.CharField(max_length=500)

class MessageReplyForm(forms.Form):
    message = forms.CharField(max_length=150)

class GroupRecommendForm(MessageForm):
    """
    A form used to recommend a file or directory.
    """
    repo_id = forms.CharField(max_length=40)
    path = forms.CharField()
    attach_type = forms.CharField(max_length=5)

class GroupAddForm(forms.Form):
    """
    A form used to add a new group.
    """
    group_name = forms.CharField(max_length=255, error_messages={
            'required': _(u'Group name can\'t be empty'),
            'max_length': _(u'Group name is too long (maximum is 255 characters)'),
            })
    def clean_group_name(self):
        group_name = self.cleaned_data['group_name']
        if not validate_group_name(group_name):
            error_msg = _(u'Group name can only contain letters, numbers or underline')
            raise forms.ValidationError(error_msg)
        else:
            return group_name

class GroupJoinMsgForm(forms.Form):
    """
    A form used to send group join request message.
    """
    group_join_msg = forms.CharField(max_length=255, error_messages={
            'required': _(u'Verification message can\'t be empty'),
            'max_length': _(u'Verification message is too long (maximun is 255 characters)'),
            })


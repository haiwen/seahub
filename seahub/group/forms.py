# encoding: utf-8
import os

from django import forms
from django.conf import settings
from django.utils.translation import ugettext_lazy as _
from seaserv import is_valid_filename

from seahub.group.utils import validate_group_name

class MessageForm(forms.Form):
    message = forms.CharField(max_length=2048)

class MessageReplyForm(forms.Form):
    message = forms.CharField(max_length=2048)

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
            error_msg = _(u'Group name can only contain letters, numbers or underscore')
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

class WikiCreateForm(forms.Form):
    """
    A form used to create wiki.
    """
    repo_name = forms.CharField(max_length=settings.MAX_FILE_NAME,
                                error_messages={
            'required': _(u'Name can\'t be empty'),
            'max_length': _(u'Name is too long (maximum is 255 characters)')
            })
    repo_desc = forms.CharField(max_length=100, error_messages={
            'required': _(u'Description can\'t be empty'),
            'max_length': _(u'Description is too long (maximum is 100 characters)')
            })

    def clean_repo_name(self):
        repo_name = self.cleaned_data['repo_name']
        if not is_valid_filename(repo_name):
            error_msg = _(u'"%s" is not a valid name') % repo_name
            raise forms.ValidationError(error_msg)
        else:
            return repo_name
    

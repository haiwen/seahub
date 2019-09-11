# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

from django import forms
from django.conf import settings
from django.utils.translation import ugettext_lazy as _
from seahub.utils import is_valid_dirent_name

from .utils import clean_page_name

class WikiCreateForm(forms.Form):
    """
    A form used to create wiki.
    """
    repo_name = forms.CharField(max_length=settings.MAX_FILE_NAME,
                                error_messages={
            'required': _('Name can\'t be empty'),
            'max_length': _('Name is too long (maximum is 255 characters)')
            })
    repo_desc = forms.CharField(max_length=100, error_messages={
            'required': _('Description can\'t be empty'),
            'max_length': _('Description is too long (maximum is 100 characters)')
            })

    def clean_repo_name(self):
        repo_name = self.cleaned_data['repo_name']
        if not is_valid_dirent_name(repo_name):
            error_msg = _('"%s" is not a valid name') % repo_name
            raise forms.ValidationError(error_msg)
        else:
            return repo_name


class WikiNewPageForm(forms.Form):
    page_name = forms.CharField(max_length=500)

    def clean_page_name(self):
        page_name = self.cleaned_data['page_name']

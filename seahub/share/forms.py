from django import forms
from django.utils.translation import ugettext_lazy as _

class RepoShareForm(forms.Form):
    """
    Form for sharing repo to user or group.
    """

    email_or_group = forms.CharField(max_length=512)
    repo_id = forms.CharField(max_length=36)
    permission = forms.ChoiceField(choices=(('rw', 'read-write'), ('r', 'read-only')))

class FileLinkShareForm(forms.Form):
    """
    Form for sharing file shared link to emails.
    """

    email = forms.CharField(max_length=512, error_messages={
            'required': _("Email is required"),
            'max_length': _("Email is not longer than 512 characters"),
            })
    file_shared_link = forms.CharField()
    

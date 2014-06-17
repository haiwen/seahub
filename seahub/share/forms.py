from django import forms
from django.contrib.auth.hashers import check_password
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
    extra_msg = forms.CharField(required=False)
    file_shared_name = forms.CharField()
    file_shared_type = forms.CharField()
    
class UploadLinkShareForm(forms.Form):
    """
    Form for sharing upload link to emails.
    """
    email = forms.CharField(max_length=512, error_messages={
            'required': _("Email is required"),
            'max_length': _("Email is not longer than 512 characters"),
            })
    shared_upload_link = forms.CharField()
    extra_msg = forms.CharField(required=False)

class SharedLinkPasswordForm(forms.Form):
    """
    Form for user to access shared files/directory.
    """
    password = forms.CharField(error_messages={'required': _('Password can\'t be empty')})
    enc_password = forms.CharField()

    def clean(self):
        password = self.cleaned_data['password']
        enc_password = self.cleaned_data['enc_password']
        if not check_password(password, enc_password):
            raise forms.ValidationError(_("Please enter a correct password."))

        return self.cleaned_data

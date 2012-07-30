# encoding: utf-8
from django import forms
from django.contrib.auth.models import User
from django.utils.translation import ugettext_lazy as _

from seaserv import ccnet_rpc, ccnet_threaded_rpc, is_valid_filename

class AddUserForm(forms.Form):
    """
    Form for adding a user.
    """

    email = forms.EmailField()
    password1 = forms.CharField(widget=forms.PasswordInput())
    password2 = forms.CharField(widget=forms.PasswordInput())

    def clean_email(self):
        email = self.cleaned_data['email']
        emailuser = ccnet_threaded_rpc.get_emailuser(email)
        if not emailuser:
            return self.cleaned_data['email']
        else:
            raise forms.ValidationError(_("A user with this email already"))                    
    def clean(self):
        """
        Verifiy that the values entered into the two password fields
        match. Note that an error here will end up in
        ``non_field_errors()`` because it doesn't apply to a single
        field.
        
        """
        if 'password1' in self.cleaned_data and 'password2' in self.cleaned_data:
            if self.cleaned_data['password1'] != self.cleaned_data['password2']:
                raise forms.ValidationError(_("The two password fields didn't match."))
        return self.cleaned_data

class FileLinkShareForm(forms.Form):
    """
    Form for sharing file shared link to emails.
    """

    email = forms.CharField(max_length=512)
    file_shared_link = forms.CharField(max_length=40)

class RepoCreateForm(forms.Form):
    """
    Form for creating repo and org repo.
    """
    repo_name = forms.CharField(max_length=15, error_messages={
            'required': '目录名不能为空',
            'max_length': '目录名太长，不超过50个字符'
            })
    repo_desc = forms.CharField(max_length=100, error_messages={
            'required': '描述不能为空',
            'max_length': '描述太长，不超过100个字符'
            })
    encryption = forms.CharField(max_length=1)
    passwd = forms.CharField(min_length=3, max_length=15, required=False,
                             error_messages={
            'min_length': '密码太短',
            'max_length': '密码太长',
            })
    passwd_again = forms.CharField(min_length=3, max_length=15, required=False,
                                   error_messages={
            'min_length': '密码太短',
            'max_length': '密码太长',
            })

    def clean_repo_name(self):
        repo_name = self.cleaned_data['repo_name']
        if not is_valid_filename(repo_name):
            error_msg = u"您输入的目录名 %s 包含非法字符" % repo_name
            raise forms.ValidationError(error_msg)
        else:
            return repo_name
        
    def clean(self):
        """
        Verifiy that the values entered into the two password fields
        match. 
        """
        if 'passwd' in self.cleaned_data and 'passwd_again' in self.cleaned_data:
            encryption = self.cleaned_data['encryption']
            if int(encryption) == 0:
                # This prevents the case that form has passwords but the
                # encryption checkbox is not selected.
                self.cleaned_data['passwd'] = None
                self.cleaned_data['passwd_again'] = None
                return self.cleaned_data
            else:
                passwd = self.cleaned_data['passwd']
                passwd_again = self.cleaned_data['passwd_again']
                if passwd != passwd_again:
                    raise forms.ValidationError("两次输入的密码不一致")
        return self.cleaned_data
    

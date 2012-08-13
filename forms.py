# encoding: utf-8
from django import forms
from django.utils.translation import ugettext_lazy as _

from seaserv import ccnet_rpc, ccnet_threaded_rpc, is_valid_filename

from seahub.base.accounts import User
from pysearpc import SearpcError

import settings

class AddUserForm(forms.Form):
    """
    Form for adding a user.
    """

    email = forms.EmailField()
    password1 = forms.CharField(widget=forms.PasswordInput())
    password2 = forms.CharField(widget=forms.PasswordInput())

    def clean_email(self):
        email = self.cleaned_data['email']
        try:
            user = User.objects.get(email=email)
            raise forms.ValidationError(_("A user with this email already"))
        except User.DoesNotExist:
            return self.cleaned_data['email']            

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


class RepoNewFileForm(forms.Form):
    """
    Form for create a new empty file
    """
    repo_id = forms.CharField(error_messages={'required': '参数错误'})
    parent_dir = forms.CharField(error_messages={'required': '参数错误'})
    new_file_name = forms.CharField(max_length=settings.MAX_UPLOAD_FILE_NAME_LEN,
                                error_messages={
                                    'max_length': '新文件名太长',
                                    'required': '新文件名不能为空',
                                })

    def clean_new_file_name(self):
        new_file_name = self.cleaned_data['new_file_name']
        try:
            if not is_valid_filename(new_file_name):
                error_msg = u"您输入的文件名 %s 包含非法字符" % new_file_name
                raise forms.ValidationError(error_msg)
            else:
                return new_file_name
        except SearpcError, e:
            raise forms.ValidationError(str(e))

class RepoNewDirForm(forms.Form):
    """
    Form for create a new empty dir
    """
    repo_id = forms.CharField(error_messages={'required': '参数错误'})
    parent_dir = forms.CharField(error_messages={'required': '参数错误'})
    new_dir_name = forms.CharField(max_length=settings.MAX_UPLOAD_FILE_NAME_LEN,
                                error_messages={
                                    'max_length': '新目录名太长',
                                    'required': '新目录名不能为空',
                            })

    def clean_new_dir_name(self):
        new_dir_name = self.cleaned_data['new_dir_name']
        try:
            if not is_valid_filename(new_dir_name):
                error_msg = u"您输入的目录名 %s 包含非法字符" % new_dir_name
                raise forms.ValidationError(error_msg)
            else:
                return new_dir_name
        except SearpcError, e:
            raise forms.ValidationError(str(e))


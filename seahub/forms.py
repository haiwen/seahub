# encoding: utf-8
from django.conf import settings
from django import forms
from django.utils.translation import ugettext_lazy as _

from seaserv import seafserv_threaded_rpc, is_valid_filename
from pysearpc import SearpcError

from seahub.base.accounts import User
from seahub.constants import DEFAULT_USER, GUEST_USER

class AddUserForm(forms.Form):
    """
    Form for adding a user.
    """
    email = forms.EmailField()
    role = forms.ChoiceField(choices=[(DEFAULT_USER, DEFAULT_USER),
                                      (GUEST_USER, GUEST_USER)])
    password1 = forms.CharField(widget=forms.PasswordInput())
    password2 = forms.CharField(widget=forms.PasswordInput())

    def clean_email(self):
        email = self.cleaned_data['email']
        try:
            user = User.objects.get(email=email)
            raise forms.ValidationError(_("A user with this email already exists."))
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
                raise forms.ValidationError(_("The two passwords didn't match."))
        return self.cleaned_data

class RepoCreateForm(forms.Form):
    """
    Form for creating repo and org repo.
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
    encryption = forms.CharField(max_length=1)
    uuid = forms.CharField(required=False)
    magic_str = forms.CharField(required=False)
    encrypted_file_key = forms.CharField(required=False)

    def clean_repo_name(self):
        repo_name = self.cleaned_data['repo_name']
        if not is_valid_filename(repo_name):
            error_msg = _(u"Name %s is not valid") % repo_name
            raise forms.ValidationError(error_msg)
        else:
            return repo_name
        
    def clean(self):
        encryption = self.cleaned_data['encryption']
        if int(encryption) == 0:
            return self.cleaned_data

        uuid = self.cleaned_data['uuid']
        magic_str = self.cleaned_data['magic_str']
        encrypted_file_key = self.cleaned_data['encrypted_file_key']
        if not (uuid and magic_str and encrypted_file_key):
            raise forms.ValidationError(_("Argument missing"))

        return self.cleaned_data

class SharedRepoCreateForm(RepoCreateForm):
    """
    Used for creating group repo and public repo
    """
    permission = forms.ChoiceField(choices=(('rw', 'read-write'), ('r', 'read-only')))

class RepoRenameDirentForm(forms.Form):
    """
    Form for rename a file/dir.
    """
    oldname = forms.CharField(error_messages={'required': _("Oldname is required")})
    newname = forms.CharField(max_length=settings.MAX_FILE_NAME,
                                error_messages={
                                    'max_length': _("It's too long."),
                                    'required': _("It's required."),
                                })

    def clean_newname(self):
        newname = self.cleaned_data['newname']
        try:
            if not is_valid_filename(newname):
                error_msg = _(u'Name "%s" is not valid') % newname
                raise forms.ValidationError(error_msg)
            else:
                return newname
        except SearpcError, e:
            raise forms.ValidationError(str(e))

class RepoNewDirentForm(forms.Form):
    """
    Form for create a new empty dir or a new empty file.
    """
    dirent_name = forms.CharField(max_length=settings.MAX_FILE_NAME,
                                error_messages={
                                    'max_length': _("It's too long."),
                                    'required': _("It's required."),
                            })

    def clean_dirent_name(self):
        dirent_name = self.cleaned_data['dirent_name']
        try:
            if not is_valid_filename(dirent_name):
                error_msg = _(u'Name "%s" is not valid') % dirent_name
                raise forms.ValidationError(error_msg)
            else:
                return dirent_name
        except SearpcError, e:
            raise forms.ValidationError(str(e))

class RepoPassowrdForm(forms.Form):
    """
    Form for user to decrypt a repo in repo page.
    """
    repo_id = forms.CharField(error_messages={'required': _('Repo id is required')})
    username = forms.CharField(error_messages={'required': _('Username is required')})
    password = forms.CharField(error_messages={'required': _('Password can\'t be empty')})

    def clean(self):
        if 'password' in self.cleaned_data:
            repo_id = self.cleaned_data['repo_id']
            username = self.cleaned_data['username']
            password = self.cleaned_data['password']
            try:
                seafserv_threaded_rpc.set_passwd(repo_id, username, password)
            except SearpcError, e:
                if e.msg == 'Bad arguments':
                    raise forms.ValidationError(_(u'Bad url format'))
                # elif e.msg == 'Repo is not encrypted':
                #     return HttpResponseRedirect(reverse('repo',
                #                                         args=[self.repo_id]))
                elif e.msg == 'Incorrect password':
                    raise forms.ValidationError(_(u'Wrong password'))
                elif e.msg == 'Internal server error':
                    raise forms.ValidationError(_(u'Internal server error'))
                else:
                    raise forms.ValidationError(_(u'Decrypt library error'))
        
class SetUserQuotaForm(forms.Form):
    """
    Form for setting user quota.
    """
    email = forms.CharField(error_messages={'required': _('Email is required')})
    space_quota = forms.IntegerField(min_value=0,
                               error_messages={'required': _('Space quota can\'t be empty'),
                                               'min_value': _('Space quota is too low (minimum value is 0)')})
    share_quota = forms.IntegerField(min_value=0, required = False,
                               error_messages={'min_value': _('Share quota is too low (minimum value is 0)')})

class RepoSettingForm(forms.Form):
    """
    Form for saving repo settings.
    """
    repo_name = forms.CharField(error_messages={'required': _('Library name is required')})
    days = forms.IntegerField(required=False,
                              error_messages={'invalid': _('Please enter a number')})

    def clean_repo_name(self):
        repo_name = self.cleaned_data['repo_name']
        if not is_valid_filename(repo_name):
            error_msg = _(u"Name %s is not valid") % repo_name
            raise forms.ValidationError(error_msg)
        else:
            return repo_name

class BatchAddUserForm(forms.Form):
    """
    Form for importing users from CSV file.
    """
    file = forms.FileField()

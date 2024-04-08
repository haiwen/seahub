# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
from django import forms
from django.utils.translation import gettext_lazy as _

from seahub.profile.models import Profile, DetailedProfile
from seahub.settings import ENABLE_UPDATE_USER_INFO


class ProfileForm(forms.Form):
    nickname = forms.CharField(max_length=64, required=False)
    intro = forms.CharField(max_length=256, required=False)

    def __init__(self, user, *args, **kwargs):
        self.user = user

        super(ProfileForm, self).__init__(*args, **kwargs)

    def clean_nickname(self):
        """
        Validates that nickname should not include '/'
        """
        if not ENABLE_UPDATE_USER_INFO:
            raise forms.ValidationError(_("Permission denied."))

        if "/" in self.cleaned_data["nickname"]:
            raise forms.ValidationError(_("Name should not include '/'."))

        return self.cleaned_data["nickname"]

    def save(self):
        username = self.user.username
        nickname = self.cleaned_data['nickname']
        intro = self.cleaned_data['intro']
        Profile.objects.add_or_update(username, nickname, intro)

class DetailedProfileForm(ProfileForm):
    contact_email = forms.CharField(max_length=256, required=False)
    department = forms.CharField(max_length=512, required=False)
    telephone = forms.CharField(max_length=100, required=False)

    def clean_contact_email(self, ):
        username = Profile.objects.get_username_by_contact_email(self.cleaned_data['contact_email'])
        req_username = self.user.username
        if req_username and username is not None and username != req_username:
            raise forms.ValidationError(_('A user with this email already exists.'))
        return self.cleaned_data['contact_email']

    def save(self):
        super(DetailedProfileForm, self).save()

        username = self.user.username
        department = self.cleaned_data['department']
        telephone = self.cleaned_data['telephone']
        DetailedProfile.objects.add_or_update(username, department, telephone)

        contact_email = self.cleaned_data['contact_email']
        Profile.objects.update_contact_email(username, contact_email)

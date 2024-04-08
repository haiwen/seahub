# Copyright (c) 2012-2016 Seafile Ltd.
import os

from django import forms
from django.forms import widgets
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _

from seahub.avatar.models import Avatar
from seahub.avatar.settings import (AVATAR_MAX_AVATARS_PER_USER, AVATAR_MAX_SIZE,
                             AVATAR_ALLOWED_FILE_EXTS, AVATAR_DEFAULT_SIZE)
from seahub.utils.error_msg import file_type_error_msg, file_size_error_msg


def avatar_img(avatar, size):
    if not avatar.thumbnail_exists(size):
        avatar.create_thumbnail(size)
    return mark_safe("""<img src="%s" alt="%s" width="%s" height="%s" />""" % 
        (avatar.avatar_url(size), str(avatar), size, size))

class UploadAvatarForm(forms.Form):

    avatar = forms.ImageField()
    
    def __init__(self, *args, **kwargs):
        self.emailuser = kwargs.pop('user').email
        super(UploadAvatarForm, self).__init__(*args, **kwargs)
        
    def clean_avatar(self):
        data = self.cleaned_data['avatar']
        if AVATAR_ALLOWED_FILE_EXTS:
            (root, ext) = os.path.splitext(data.name.lower())
            if ext not in AVATAR_ALLOWED_FILE_EXTS:
                error_msg = file_type_error_msg(ext, AVATAR_ALLOWED_FILE_EXTS)
                raise forms.ValidationError(error_msg)
        if data.size > AVATAR_MAX_SIZE:
            error_msg = file_size_error_msg(data.size, AVATAR_MAX_SIZE)
            raise forms.ValidationError(error_msg)
        count = Avatar.objects.filter(emailuser=self.emailuser).count()
        if AVATAR_MAX_AVATARS_PER_USER > 1 and \
           count >= AVATAR_MAX_AVATARS_PER_USER: 
            raise forms.ValidationError(
                _("You already have %(nb_avatars)d avatars, and the maximum allowed is %(nb_max_avatars)d.") %
                { 'nb_avatars' : count, 'nb_max_avatars' : AVATAR_MAX_AVATARS_PER_USER})
        return        

class GroupAvatarForm(forms.Form):
    avatar = forms.ImageField()

    def clean_avatar(self):
        data = self.cleaned_data['avatar']
        if AVATAR_ALLOWED_FILE_EXTS:
            (root, ext) = os.path.splitext(data.name.lower())
            if ext not in AVATAR_ALLOWED_FILE_EXTS:
                error_msg = file_type_error_msg(ext, AVATAR_ALLOWED_FILE_EXTS)
                raise forms.ValidationError(error_msg)
            if data.size > AVATAR_MAX_SIZE:
                error_msg = file_size_error_msg(data.size, AVATAR_MAX_SIZE)
                raise forms.ValidationError(error_msg)
    

class PrimaryAvatarForm(forms.Form):
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        size = kwargs.pop('size', AVATAR_DEFAULT_SIZE)
        avatars = kwargs.pop('avatars')
        super(PrimaryAvatarForm, self).__init__(*args, **kwargs)
        self.fields['choice'] = forms.ChoiceField(
            choices=[(c.id, avatar_img(c, size)) for c in avatars],
            widget=widgets.RadioSelect)

class DeleteAvatarForm(forms.Form):

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        size = kwargs.pop('size', AVATAR_DEFAULT_SIZE)
        avatars = kwargs.pop('avatars')
        super(DeleteAvatarForm, self).__init__(*args, **kwargs)
        self.fields['choices'] = forms.MultipleChoiceField(
            choices=[(c.id, avatar_img(c, size)) for c in avatars],
            widget=widgets.CheckboxSelectMultiple)

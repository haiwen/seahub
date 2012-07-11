import os

from django import forms
from django.utils.translation import ugettext as _
from django.template.defaultfilters import filesizeformat

from group.settings import ( AVATAR_MAX_SIZE, AVATAR_ALLOWED_FILE_EXTS)

class MessageForm(forms.Form):
    message = forms.CharField(max_length=500)

class MessageReplyForm(forms.Form):
    message = forms.CharField(max_length=150)

class AvatarForm(forms.Form):
    avatar = forms.ImageField()

    def clean_avatar(self):
        data = self.cleaned_data['avatar']
        if AVATAR_ALLOWED_FILE_EXTS:
            (root, ext) = os.path.splitext(data.name.lower())
            if ext not in AVATAR_ALLOWED_FILE_EXTS:
                raise forms.ValidationError(
                    _(u"%(ext)s is an invalid file extension. Authorized extensions are : %(valid_exts_list)s") % 
                    { 'ext' : ext, 'valid_exts_list' : ", ".join(AVATAR_ALLOWED_FILE_EXTS) })  
            if data.size > AVATAR_MAX_SIZE:
                raise forms.ValidationError(
                    _(u"Your file is too big (%(size)s), the maximum allowed size is %(max_valid_size)s") %
                    { 'size' : filesizeformat(data.size), 'max_valid_size' : filesizeformat(AVATAR_MAX_SIZE)})


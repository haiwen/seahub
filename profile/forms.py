from django import forms

class SetUserProfileForm(forms.Form):

    status = forms.CharField(max_length=140, required=False)
    interests = forms.CharField(max_length=256, required=False)

    #signature = forms.CharField()

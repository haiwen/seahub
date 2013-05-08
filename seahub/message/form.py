from django import forms

class MessageForm(forms.Form):
    to_email = forms.EmailField()
    message = forms.CharField(max_length=500)

class ToEmailForm(forms.Form):
    mass_email = forms.CharField(max_length=512)
    mass_msg   = forms.CharField(max_length=512) 

class CheckEmail(forms.Form):
    check_email = forms.EmailField()
from django import forms

class MessageForm(forms.Form):
    mass_email = forms.CharField(max_length=2048)
    mass_msg   = forms.CharField(max_length=512)     


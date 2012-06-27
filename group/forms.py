from django import forms

class MessageForm(forms.Form):
    message = forms.CharField(max_length=500)

class MessageReplyForm(forms.Form):
    message = forms.CharField(max_length=150)
    

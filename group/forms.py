import os

from django import forms

class MessageForm(forms.Form):
    message = forms.CharField(max_length=500)

class MessageReplyForm(forms.Form):
    message = forms.CharField(max_length=150)

class GroupRecommendForm(MessageForm):
    """
    A form used to recommend a file or directory.
    """
    groups = forms.CharField()
    repo_id = forms.CharField(max_length=40)
    path = forms.CharField()
    attach_type = forms.CharField(max_length=5)

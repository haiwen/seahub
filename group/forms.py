import os

from django import forms

class MessageForm(forms.Form):
    message = forms.CharField(max_length=5)

class MessageReplyForm(forms.Form):
    message = forms.CharField(max_length=150)

class FileRecommendForm(MessageForm):
    """
    A form used to recommend a file.
    """
    groups = forms.CharField()
    repo_id = forms.CharField(max_length=40)
    file_path = forms.CharField()

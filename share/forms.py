from django import forms

class RepoShareForm(forms.Form):
    """
    Form for sharing repo to user or group.
    """

    email_or_group = forms.CharField(max_length=512)
    repo_id = forms.CharField(max_length=36)

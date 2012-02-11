from django import forms
from django.contrib.auth.models import User


class GroupAddRepoForm(forms.Form):
    """
    Form for adding repo to a group.

    """

    repo_id = forms.CharField(max_length=36)
    
    def __init__(self, *args, **kwargs):
        super(GroupAddRepoForm, self).__init__(*args, **kwargs)


class UserShareForm(forms.Form):
    """
    Form for sharing repo to a user.
    """

    user_email = forms.EmailField()
    repo_id = forms.CharField(max_length=36)
    
    def __init__(self, *args, **kwargs):
        super(UserShareForm, self).__init__(*args, **kwargs)

    def clean_user_email(self):
        data = self.cleaned_data['user_email']
        try:
            # put the user in form.to_user for further use
            self.to_user = User.objects.get(email=data)
        except User.DoesNotExist:
            raise forms.ValidationError("No user with such email")

        return data

    def clean_repo_id(self):
        data = self.cleaned_data['repo_id']
        if len(data) != 36:
            raise forms.ValidationError("Invalid repo id")

        return data

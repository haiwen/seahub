from django import forms
from models import GroupRepo


class GroupAddRepoForm(forms.Form):
    """
    Form for adding repo to a group.

    """

    repo_id = forms.CharField(max_length=36)
    
    def __init__(self, *args, **kwargs):
        super(GroupAddRepoForm, self).__init__(*args, **kwargs)


from django import forms


class AddContactForm(forms.Form):
    """
    Form for adding a contact.

    """

    email = forms.EmailField()
    
    def __init__(self, *args, **kwargs):
        super(AddContactForm, self).__init__(*args, **kwargs)


"""Django forms for the termsandconditions application"""

# pylint: disable=E1120,W0613

from django import forms
from termsandconditions.models import UserTermsAndConditions, TermsAndConditions


class UserTermsAndConditionsModelForm(forms.ModelForm):
    """Form used when accepting Terms and Conditions - returnTo is used to catch where to end up."""

    returnTo = forms.CharField(required=False, initial="/", widget=forms.HiddenInput())

    class Meta(object):
        """Configuration for this Modelform"""
        model = UserTermsAndConditions
        exclude = ('date_accepted', 'ip_address', 'username')
        widgets = {'terms': forms.HiddenInput()}


class EmailTermsForm(forms.Form):
    """Form used to collect email address to send terms and conditions to."""
    email_subject = forms.CharField(widget=forms.HiddenInput())
    email_address = forms.EmailField()
    returnTo = forms.CharField(required=False, initial="/", widget=forms.HiddenInput())
    terms = forms.ModelChoiceField(queryset=TermsAndConditions.objects.all(), widget=forms.HiddenInput())

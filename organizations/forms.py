# encoding: utf-8
from django import forms
from seaserv import ccnet_threaded_rpc

class OrgCreateForm(forms.Form):
    org_name = forms.CharField(max_length=256,
                               widget=forms.TextInput(),
                               label="Organization Name")
    url_prefix = forms.RegexField(label="Url Prefix", max_length=20,
                                  regex=r'^[a-z0-9]+$',
                                  error_message="个性域名只能包含字母或数字")

    def clean_url_prefix(self):
        url_prefix = self.cleaned_data['url_prefix']
        org = ccnet_threaded_rpc.get_org_by_url_prefix(url_prefix)
        if not org:
            return url_prefix
        else:
            raise forms.ValidationError("该个性域名已被注册")

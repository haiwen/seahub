from django import forms
from django.utils.encoding import smart_str
from django.utils.hashcompat import md5_constructor, sha_constructor
from django.utils.translation import ugettext_lazy as _
from django.conf import settings

from django.contrib.sites.models import RequestSite
from django.contrib.sites.models import Site
from auth.models import get_hexdigest, check_password
from auth import authenticate, login
from registration import signals
from registration.forms import RegistrationForm
from registration.models import RegistrationProfile
from seaserv import ccnet_rpc, get_ccnetuser

class UserManager(object):
    def create_user(self, username, password=None, is_staff=False, is_active=False):
        ccnet_rpc.add_emailuser(username, password, is_staff, is_active)

        ccnetuser = get_ccnetuser(username=username)
        return ccnetuser

def convert_to_ccnetuser(emailuser):
    ccnetuser = CcnetUser(emailuser.props.email,
                          raw_password='')
    ccnetuser.id = emailuser.props.id
    ccnetuser.email = emailuser.props.email
    ccnetuser.password = emailuser.props.passwd
    ccnetuser.is_staff = emailuser.props.is_staff
    ccnetuser.is_active = emailuser.props.is_active
    ccnetuser.ctime = emailuser.props.ctime

    return ccnetuser

class CcnetUser(object):
    is_staff = False
    is_active = False
    objects = UserManager()
    
    def __init__(self, username, raw_password):
        self.username = username
        self.raw_password = raw_password

    def __unicode__(self):
        return self.username
    
    def validate_emailuser(self, email, raw_password):
        self.set_password(raw_password)
        return ccnet_rpc.validate_emailuser(email, raw_password)

    def is_authenticated(self):
        """
        Always return True. This is a way to tell if the user has been
        authenticated in templates.
        """
        return True
    
    def is_anonymous(self):
        """
        Always returns False. This is a way of comparing User objects to
        anonymous users.
        """
        return False

    def save(self):
        emailuser = ccnet_rpc.get_emailuser(self.username)
        if emailuser:
            ccnet_rpc.update_emailuser(self.id, self.password, self.is_staff,
                                       self.is_active)
        else:
            self.objects.create_user(username=self.username,
                                     password=self.raw_password,
                                     is_staff=self.is_staff,
                                     is_active=self.is_active)

    def delete(self):
        """
        Remove from ccnet EmailUser table and Binding table
        """
        ccnet_rpc.remove_emailuser(self.username)
        ccnet_rpc.remove_binding(self.username)

    def get_and_delete_messages(self):
        messages = []
        return messages
    
    def set_password(self, raw_password):
        if raw_password is None:
            self.set_unusable_password()
        else:
            algo = 'sha1'
            hsh = get_hexdigest(algo, '', raw_password)
            self.password = '%s' % hsh
    
    def check_password(self, raw_password):
        """
        Returns a boolean of whether the raw_password was correct. Handles
        encryption formats behind the scenes.
        """
        # Backwards-compatibility check. Older passwords won't include the
        # algorithm or salt.

        if '$' not in self.password:
            is_correct = (self.password == get_hexdigest('sha1', '', raw_password))
            return is_correct
        return check_password(raw_password, self.password)
    
    def email_user(self, subject, message, from_email=None):
        "Sends an e-mail to this User."
        from django.core.mail import send_mail
        send_mail(subject, message, from_email, [self.username])

    
class RegistrationBackend(object):
    """
    A registration backend which follows a simple workflow:

    1. User signs up, inactive account is created.

    2. Email is sent to user with activation link.

    3. User clicks activation link, account is now active.

    Using this backend requires that

    * ``registration`` be listed in the ``INSTALLED_APPS`` setting
      (since this backend makes use of models defined in this
      application).

    * The setting ``ACCOUNT_ACTIVATION_DAYS`` be supplied, specifying
      (as an integer) the number of days from registration during
      which a user may activate their account (after that period
      expires, activation will be disallowed).

    * The creation of the templates
      ``registration/activation_email_subject.txt`` and
      ``registration/activation_email.txt``, which will be used for
      the activation email. See the notes for this backends
      ``register`` method for details regarding these templates.

    Additionally, registration can be temporarily closed by adding the
    setting ``REGISTRATION_OPEN`` and setting it to
    ``False``. Omitting this setting, or setting it to ``True``, will
    be interpreted as meaning that registration is currently open and
    permitted.

    Internally, this is accomplished via storing an activation key in
    an instance of ``registration.models.RegistrationProfile``. See
    that model and its custom manager for full documentation of its
    fields and supported operations.
    
    """
    def register(self, request, **kwargs):
        """
        Given a username, email address and password, register a new
        user account, which will initially be inactive.

        Along with the new ``User`` object, a new
        ``registration.models.RegistrationProfile`` will be created,
        tied to that ``User``, containing the activation key which
        will be used for this account.

        An email will be sent to the supplied email address; this
        email should contain an activation link. The email will be
        rendered using two templates. See the documentation for
        ``RegistrationProfile.send_activation_email()`` for
        information about these templates and the contexts provided to
        them.

        After the ``User`` and ``RegistrationProfile`` are created and
        the activation email is sent, the signal
        ``registration.signals.user_registered`` will be sent, with
        the new ``User`` as the keyword argument ``user`` and the
        class of this backend as the sender.

        """
        email, password = kwargs['email'], kwargs['password1']
        username = email
        if Site._meta.installed:
            site = Site.objects.get_current()
        else:
            site = RequestSite(request)


        if settings.ACTIVATE_AFTER_REGISTRATION == True:
            # since user will be activated after registration,
            # so we will not use email sending, just create acitvated user
            new_user = RegistrationProfile.objects.create_active_user(username, email,
                                                                        password, site,
                                                                        send_email=False)
            # login the user
            new_user.backend='auth.backends.ModelBackend' 
            login(request, new_user)
        else:
            # create inactive user, user can be activated by admin, or through activated email
            new_user = RegistrationProfile.objects.create_inactive_user(username, email,
                                                                        password, site,
                                                                        send_email=settings.REGISTRATION_SEND_MAIL)

        userid = kwargs['userid']
        if userid:
            ccnet_rpc.add_binding(new_user.username, userid)

        signals.user_registered.send(sender=self.__class__,
                                     user=new_user,
                                     request=request)
        return new_user

    def activate(self, request, activation_key):
        """
        Given an an activation key, look up and activate the user
        account corresponding to that key (if possible).

        After successful activation, the signal
        ``registration.signals.user_activated`` will be sent, with the
        newly activated ``User`` as the keyword argument ``user`` and
        the class of this backend as the sender.
        
        """
        activated = RegistrationProfile.objects.activate_user(activation_key)
        if activated:
            signals.user_activated.send(sender=self.__class__,
                                        user=activated,
                                        request=request)
            # login the user
            activated.backend='auth.backends.ModelBackend' 
            login(request, activated)
            # TODO: user.user_id should be change
            try:
                if request.user.user_id:
                    ccnet_rpc.add_client(ccnet_user_id)
            except:
                pass

        return activated

    def registration_allowed(self, request):
        """
        Indicate whether account registration is currently permitted,
        based on the value of the setting ``REGISTRATION_OPEN``. This
        is determined as follows:

        * If ``REGISTRATION_OPEN`` is not specified in settings, or is
          set to ``True``, registration is permitted.

        * If ``REGISTRATION_OPEN`` is both specified and set to
          ``False``, registration is not permitted.
        
        """
        return getattr(settings, 'REGISTRATION_OPEN', True)

    def get_form_class(self, request):
        """
        Return the default form class used for user registration.
        
        """
        return RegistrationForm

    def post_registration_redirect(self, request, user):
        """
        Return the name of the URL to redirect to after successful
        user registration.
        
        """
        return ('registration_complete', (), {})

    def post_activation_redirect(self, request, user):
        """
        Return the name of the URL to redirect to after successful
        account activation.
        
        """
        return ('myhome', (), {})


class RegistrationForm(forms.Form):
    """
    Form for registering a new user account.
    
    Validates that the requested email is not already in use, and
    requires the password to be entered twice to catch typos.    
    """
    attrs_dict = { 'class': 'required' }

    email = forms.EmailField(widget=forms.TextInput(attrs=dict(attrs_dict,
                                                               maxlength=75)),
                             label=_("Email address"))
    userid = forms.RegexField(regex=r'^\w+$',
                              max_length=40,
                              required=False,
                              widget=forms.TextInput(),
                              label=_("Username"),
                              error_messages={ 'invalid': _("This value must be of length 40") })

    password1 = forms.CharField(widget=forms.PasswordInput(attrs=attrs_dict, render_value=False),
                                label=_("Password"))
    password2 = forms.CharField(widget=forms.PasswordInput(attrs=attrs_dict, render_value=False),
                                label=_("Password (again)"))

    def clean_email(self):
        email = self.cleaned_data['email']
        emailuser = ccnet_rpc.get_emailuser(email)
        if not emailuser:
            return self.cleaned_data['email']
        else:
            raise forms.ValidationError(_("A user with this email already"))                        

    def clean_userid(self):
        if self.cleaned_data['userid'] and len(self.cleaned_data['userid']) != 40:
            raise forms.ValidationError(_("Invalid user id."))
        return self.cleaned_data['userid']

    def clean(self):
        """
        Verifiy that the values entered into the two password fields
        match. Note that an error here will end up in
        ``non_field_errors()`` because it doesn't apply to a single
        field.
        
        """
        if 'password1' in self.cleaned_data and 'password2' in self.cleaned_data:
            if self.cleaned_data['password1'] != self.cleaned_data['password2']:
                raise forms.ValidationError(_("The two password fields didn't match."))
        return self.cleaned_data


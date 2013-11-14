import re
import logging
from django.conf import settings
# Avoid shadowing the login() view below.
from django.views.decorators.csrf import csrf_protect
from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.shortcuts import render_to_response, get_object_or_404
from django.contrib.sites.models import Site, RequestSite
from django.http import HttpResponseRedirect, Http404
from django.template import RequestContext
from django.utils.http import urlquote, base36_to_int
from django.utils.translation import ugettext as _
from django.views.decorators.cache import never_cache

from seahub.auth import REDIRECT_FIELD_NAME
from seahub.auth import login as auth_login
from seahub.auth.decorators import login_required
from seahub.auth.forms import AuthenticationForm, CaptchaAuthenticationForm
from seahub.auth.forms import PasswordResetForm, SetPasswordForm, PasswordChangeForm
from seahub.auth.tokens import default_token_generator

from seahub.base.accounts import User

# Get an instance of a logger
logger = logging.getLogger(__name__)

LOGIN_ATTEMPT_PREFIX = 'UserLoginAttempt_'

def log_user_in(request, user, redirect_to):
    # Light security check -- make sure redirect_to isn't garbage.
    if not redirect_to or ' ' in redirect_to:
        redirect_to = settings.LOGIN_REDIRECT_URL
            
    # Heavier security check -- redirects to http://example.com should 
    # not be allowed, but things like /view/?param=http://example.com 
    # should be allowed. This regex checks if there is a '//' *before* a
    # question mark.
    elif '//' in redirect_to and re.match(r'[^\?]*//', redirect_to):
        redirect_to = settings.LOGIN_REDIRECT_URL

    # Okay, security checks complete. Log the user in.
    auth_login(request, user)

    if request.session.test_cookie_worked():
        request.session.delete_test_cookie()

    cache.delete(LOGIN_ATTEMPT_PREFIX+user.username)

    return HttpResponseRedirect(redirect_to)
    
@csrf_protect
@never_cache
def login(request, template_name='registration/login.html',
          redirect_if_logged_in=None,
          redirect_field_name=REDIRECT_FIELD_NAME,
          authentication_form=AuthenticationForm):
    """Displays the login form and handles the login action."""

    if request.user.is_authenticated() and redirect_if_logged_in:
        return HttpResponseRedirect(reverse(redirect_if_logged_in))

    redirect_to = request.REQUEST.get(redirect_field_name, '')

    if request.method == "POST":
        if request.REQUEST.get('captcha_0', '') != '':
            # have captcha
            form = CaptchaAuthenticationForm(data=request.POST)
            if form.is_valid():
                # captcha & passwod is valid, log user in
                return log_user_in(request, form.get_user(), redirect_to)
            # else:
            # show page with captcha
        else:
            form = authentication_form(data=request.POST)
            if form.is_valid():
                # password is valid, log user in
                return log_user_in(request, form.get_user(), redirect_to)
            else:
                username = request.REQUEST.get('username', '')
                failed_attempt = cache.get(LOGIN_ATTEMPT_PREFIX+username, 1)
                if failed_attempt >= settings.LOGIN_ATTEMPT_LIMIT:
                    form = CaptchaAuthenticationForm()
                else:
                    failed_attempt += 1
                    cache.set(LOGIN_ATTEMPT_PREFIX+username, failed_attempt,
                              settings.LOGIN_ATTEMPT_TIMEOUT)
                    form = authentication_form(data=request.POST)
    else:
        ### GET
        form = authentication_form(request)
    
    request.session.set_test_cookie()
    
    if Site._meta.installed:
        current_site = Site.objects.get_current()
    else:
        current_site = RequestSite(request)
    
    return render_to_response(template_name, {
            'form': form,
            redirect_field_name: redirect_to,
            'site': current_site,
            'site_name': current_site.name,
            }, context_instance=RequestContext(request))

def logout(request, next_page=None, template_name='registration/logged_out.html', redirect_field_name=REDIRECT_FIELD_NAME):
    "Logs out the user and displays 'You are logged out' message."
    from seahub.auth import logout
    logout(request)
    if next_page is None:
        redirect_to = request.REQUEST.get(redirect_field_name, '')
        if redirect_to:
            return HttpResponseRedirect(redirect_to)
        else:
            return render_to_response(template_name, {
                'title': _('Logged out')
            }, context_instance=RequestContext(request))
    else:
        # Redirect to this page until the session has been cleared.
        return HttpResponseRedirect(next_page or request.path)

def logout_then_login(request, login_url=None):
    "Logs out the user if he is logged in. Then redirects to the log-in page."
    if not login_url:
        login_url = settings.LOGIN_URL
    return logout(request, login_url)

def redirect_to_login(next, login_url=None, redirect_field_name=REDIRECT_FIELD_NAME):
    "Redirects the user to the login page, passing the given 'next' page"
    if not login_url:
        login_url = settings.LOGIN_URL
    return HttpResponseRedirect('%s?%s=%s' % (login_url, urlquote(redirect_field_name), urlquote(next)))

# 4 views for password reset:
# - password_reset sends the mail
# - password_reset_done shows a success message for the above
# - password_reset_confirm checks the link the user clicked and 
#   prompts for a new password
# - password_reset_complete shows a success message for the above

@csrf_protect
def password_reset(request, is_admin_site=False, template_name='registration/password_reset_form.html',
        email_template_name='registration/password_reset_email.html',
        password_reset_form=PasswordResetForm, token_generator=default_token_generator,
        post_reset_redirect=None):
    if post_reset_redirect is None:
        post_reset_redirect = reverse('auth_password_reset_done')
    if request.method == "POST":
        form = password_reset_form(request.POST)
        if form.is_valid():
            opts = {}
            opts['use_https'] = request.is_secure()
            opts['token_generator'] = token_generator
            if is_admin_site:
                opts['domain_override'] = request.META['HTTP_HOST']
            else:
                opts['email_template_name'] = email_template_name
                if not Site._meta.installed:
                    opts['domain_override'] = RequestSite(request).domain
            try:
                form.save(**opts)
            except Exception, e:
                logger.error(str(e))
                messages.error(request, _(u'Failed to send email, please contact administrator.'))
                return render_to_response(template_name, {
                        'form': form,
                        }, context_instance=RequestContext(request))
            else:
                return HttpResponseRedirect(post_reset_redirect)
    else:
        form = password_reset_form()
    return render_to_response(template_name, {
        'form': form,
    }, context_instance=RequestContext(request))

def password_reset_done(request, template_name='registration/password_reset_done.html'):
    return render_to_response(template_name, context_instance=RequestContext(request))

# Doesn't need csrf_protect since no-one can guess the URL
def password_reset_confirm(request, uidb36=None, token=None, template_name='registration/password_reset_confirm.html',
                           token_generator=default_token_generator, set_password_form=SetPasswordForm,
                           post_reset_redirect=None):
    """
    View that checks the hash in a password reset link and presents a
    form for entering a new password.
    """
    assert uidb36 is not None and token is not None # checked by URLconf
    if post_reset_redirect is None:
        post_reset_redirect = reverse('auth_password_reset_complete')
    try:
        uid_int = base36_to_int(uidb36)
        user = User.objects.get(id=uid_int)
    except (ValueError, User.DoesNotExist):
        user = None

    context_instance = RequestContext(request)

    if token_generator.check_token(user, token):
        context_instance['validlink'] = True
        if request.method == 'POST':
            form = set_password_form(user, request.POST)
            if form.is_valid():
                form.save()
                return HttpResponseRedirect(post_reset_redirect)
        else:
            form = set_password_form(None)
    else:
        context_instance['validlink'] = False
        form = None
    context_instance['form'] = form
    return render_to_response(template_name, context_instance=context_instance)

def password_reset_complete(request, template_name='registration/password_reset_complete.html'):
    return render_to_response(template_name, context_instance=RequestContext(request,
                                                                             {'login_url': settings.LOGIN_URL}))

@csrf_protect
@login_required
def password_change(request, template_name='registration/password_change_form.html',
                    post_change_redirect=None, password_change_form=PasswordChangeForm):
    if post_change_redirect is None:
        post_change_redirect = reverse('auth_password_change_done')
    if request.method == "POST":
        form = password_change_form(user=request.user, data=request.POST)
        if form.is_valid():
            form.save()
            return HttpResponseRedirect(post_change_redirect)
    else:
        form = password_change_form(user=request.user)
    return render_to_response(template_name, {
        'form': form,
    }, context_instance=RequestContext(request))

def password_change_done(request, template_name='registration/password_change_done.html'):
    return render_to_response(template_name, context_instance=RequestContext(request))

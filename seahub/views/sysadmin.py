# encoding: utf-8

import os
from types import FunctionType
import logging
import simplejson as json

from django.core.urlresolvers import reverse
from django.core.mail import send_mail
from django.contrib import messages
from django.http import HttpResponse, Http404, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import Context, loader, RequestContext
from django.utils.translation import ugettext as _
from django.contrib.sites.models import RequestSite

import seaserv
from seaserv import ccnet_threaded_rpc, get_emailusers, CALC_SHARE_USAGE
from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.base.accounts import User
from seahub.base.decorators import sys_staff_required
from seahub.auth.decorators import login_required
from seahub.utils import IS_EMAIL_CONFIGURED
from seahub.forms import SetUserQuotaForm, AddUserForm
from seahub.profile.models import Profile
from seahub.share.models import FileShare

import seahub.settings as settings
from seahub.settings import INIT_PASSWD, \
    SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER, SEND_EMAIL_ON_RESETTING_USER_PASSWD

logger = logging.getLogger(__name__)

@login_required
@sys_staff_required
def sys_repo_admin(request):
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    repos_all = seafile_api.get_repo_list(per_page * (current_page -1),
                                          per_page + 1)
    repos = repos_all[:per_page]
    if len(repos_all) == per_page + 1:
        page_next = True
    else:
        page_next = False

    for repo in repos:
        try:
            repo.owner = seafile_api.get_repo_owner(repo.id)
        except:
            repo.owner = "failed to get"

    return render_to_response(
        'sysadmin/sys_repo_admin.html', {
            'repos': repos,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        },
        context_instance=RequestContext(request))


@login_required
@sys_staff_required
def sys_user_admin(request):
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25
    users_plus_one = get_emailusers(per_page * (current_page - 1), per_page + 1)
    if len(users_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    users = users_plus_one[:per_page]
    for user in users:
        if user.props.id == request.user.id:
            user.is_self = True
        try:
            user.self_usage = seafile_api.get_user_self_usage(user.email)
            user.share_usage = seafile_api.get_user_share_usage(user.email)
            user.quota = seafile_api.get_user_quota(user.email)
        except:
            user.self_usage = -1
            user.share_usage = -1
            user.quota = -1
            
    return render_to_response(
        'sysadmin/sys_useradmin.html', {
            'users': users,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            'CALC_SHARE_USAGE': CALC_SHARE_USAGE,
        },
        context_instance=RequestContext(request))

@login_required
@sys_staff_required
def user_info(request, email):
    if request.method == 'POST':
        result = {}
        content_type = 'application/json; charset=utf-8'

        f = SetUserQuotaForm(request.POST)
        if f.is_valid():
            email = f.cleaned_data['email']
            quota_mb = f.cleaned_data['quota']
            quota = quota_mb * (1 << 20)

            try:
                seafile_api.set_user_quota(email, quota)
            except:
                result['error'] = _(u'Failed to set quota: internal error')
                return HttpResponse(json.dumps(result), content_type=content_type)

            result['success'] = True
            return HttpResponse(json.dumps(result), content_type=content_type)
        else:
            result['error'] = str(f.errors.values()[0])
            return HttpResponse(json.dumps(result), content_type=content_type)

    owned_repos = []

    owned_repos = seafile_api.get_owned_repo_list(email)

    quota = seafile_api.get_user_quota(email)
    quota_usage = 0
    share_usage = 0
    my_usage = 0
    my_usage = seafile_api.get_user_self_usage(email)
    if CALC_SHARE_USAGE:
        try:
            share_usage = seafile_api.get_user_share_usage(email)
        except SearpcError, e:
            logger.error(e)
            share_usage = 0
        quota_usage = my_usage + share_usage
    else:
        quota_usage = my_usage

    # Repos that are share to user
    in_repos = seafile_api.get_share_in_repo_list(email, -1, -1)

    # get nickname
    if not Profile.objects.filter(user=email):
        nickname = ''
    else:
        profile = Profile.objects.filter(user=email)[0]
        nickname = profile.nickname
    
    return render_to_response(
        'sysadmin/userinfo.html', {
            'owned_repos': owned_repos,
            'quota': quota,
            'quota_usage': quota_usage,
            'CALC_SHARE_USAGE': CALC_SHARE_USAGE,
            'share_usage': share_usage,
            'my_usage': my_usage,
            'in_repos': in_repos,
            'email': email,
            'nickname': nickname,
            }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def user_remove(request, user_id):
    """Remove user, also remove group relationship."""
    try:
        user = User.objects.get(id=int(user_id))
        user.delete()
        messages.success(request, _(u'Successfully deleted %s') % user.username)
    except User.DoesNotExist:
        messages.error(request, _(u'Failed to delete: the user does not exist'))
    
    return HttpResponseRedirect(request.META["HTTP_REFERER"])

@login_required
@sys_staff_required
def user_make_admin(request, user_id):
    """Set user as system admin."""
    try:
        user = User.objects.get(id=int(user_id))
        user.is_staff = True
        user.save()
        messages.success(request, _(u'Successfully set %s as admin') % user.username)
    except User.DoesNotExist:
        messages.error(request, _(u'Failed to set admin: the user does not exist'))

    return HttpResponseRedirect(request.META["HTTP_REFERER"])

@login_required
@sys_staff_required
def user_remove_admin(request, user_id):
    """Unset user admin."""
    try:
        user = User.objects.get(id=int(user_id))
        user.is_staff = False
        user.save()
        messages.success(request, _(u'Successfully revoke the admin permission of %s') % user.username)
    except User.DoesNotExist:
        messages.error(request, _(u'Failed to revoke admin: the user does not exist'))
    
    return HttpResponseRedirect(request.META["HTTP_REFERER"])

@login_required
@sys_staff_required
def user_activate(request, user_id):
    try:
        user = User.objects.get(id=int(user_id))
        user.is_active = True
        user.save()
        messages.success(request, _(u'Successfully activated "%s".') % user.email)
    except User.DoesNotExist:
        messages.success(request, _(u'Failed to activate: user does not exist.'))

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = reverse('sys_useradmin')
        
    return HttpResponseRedirect(next)

def send_user_reset_email(request, email, password):
    """
    Send email when reset user password.
    """
    
    t = loader.get_template('sysadmin/user_reset_email.html')
    c = {
        'email': email,
        'password': password,
        'site_name': settings.SITE_NAME,
        }
    send_mail(_(u'Password Reset'), t.render(Context(c)),
              None, [email], fail_silently=False)
    
@login_required
@sys_staff_required
def user_reset(request, user_id):
    """Reset password for user."""
    try:
        user = User.objects.get(id=int(user_id))
        if isinstance(INIT_PASSWD, FunctionType):
            new_password = INIT_PASSWD()
        else:
            new_password = INIT_PASSWD
        user.set_password(new_password)
        user.save()

        if IS_EMAIL_CONFIGURED:
            if SEND_EMAIL_ON_RESETTING_USER_PASSWD:
                try:
                    send_user_reset_email(request, user.email, new_password)
                    msg = _('Successfully reset password to %(passwd)s, an email has been sent to %(user)s.') % \
                        {'passwd': new_password, 'user': user.email}
                    messages.success(request, msg)
                except Exception, e:
                    logger.error(str(e))
                    msg = _('Successfully reset password to %(passwd)s, but failed to send email to %(user)s, please check your email configuration.') % \
                        {'passwd':new_password, 'user': user.email}
                    messages.success(request, msg)
            else:
                messages.success(request, _(u'Successfully reset password to %(passwd)s for user %(user)s.') % \
                                     {'passwd':new_password,'user': user.email})
        else:
            messages.success(request, _(u'Successfully reset password to %(passwd)s for user %(user)s. But email notification can not be sent, because Email service is not properly configured.') % \
                                 {'passwd':new_password,'user': user.email})
    except User.DoesNotExist:
        msg = _(u'Failed to reset password: user does not exist')
        messages.error(request, msg)

    return HttpResponseRedirect(reverse('sys_useradmin'))
    
def send_user_add_mail(request, email, password):
    """Send email when add new user."""
    
    use_https = request.is_secure()
    domain = RequestSite(request).domain
    
    t = loader.get_template('sysadmin/user_add_email.html')
    c = {
        'user': request.user.username,
        'org': request.user.org,
        'email': email,
        'password': password,
        'domain': domain,
        'protocol': use_https and 'https' or 'http',
        'site_name': settings.SITE_NAME,
        }
    send_mail(_(u'Seafile Registration Information'), t.render(Context(c)),
              None, [email], fail_silently=False)

@login_required
def user_add(request):
    """Add a user"""

    if not request.user.is_staff and not request.user.org['is_staff']:
        raise Http404

    base_template = 'org_admin_base.html' if request.user.org else 'admin_base.html'
    
    content_type = 'application/json; charset=utf-8'
    if request.method == 'POST':
        form = AddUserForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password1']

            user = User.objects.create_user(email, password, is_staff=False,
                                            is_active=True)
            if request.user.org:
                org_id = request.user.org['org_id']
                url_prefix = request.user.org['url_prefix']
                ccnet_threaded_rpc.add_org_user(org_id, email, 0)
                if hasattr(settings, 'EMAIL_HOST'):
                    send_user_add_mail(request, email, password)
                    
                return HttpResponseRedirect(reverse('org_useradmin',
                                                    args=[url_prefix]))
            else:
                if IS_EMAIL_CONFIGURED:
                    if SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER:
                        try:
                            send_user_add_mail(request, email, password)
                            messages.success(request, _(u'Successfully added user %s. An email notification has been sent.') % email)
                        except Exception, e:
                            logger.error(str(e))
                            messages.success(request, _(u'Successfully added user %s. An error accurs when sending email notification, please check your email configuration.') % email)
                    else:
                        messages.success(request, _(u'Successfully added user %s.') % email)
                else:
                    messages.success(request, _(u'Successfully added user %s. But email notification can not be sent, because Email service is not properly configured.') % email)

                return HttpResponse(json.dumps({'success': True}), content_type=content_type)
        else:
            return HttpResponse(json.dumps({'err': str(form.errors)}), status=400, content_type=content_type)

@login_required
@sys_staff_required
def sys_group_admin(request):
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    groups_plus_one = ccnet_threaded_rpc.get_all_groups(per_page * (current_page -1),
                                               per_page +1)
        
    groups = groups_plus_one[:per_page]

    if len(groups_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    return render_to_response('sysadmin/sys_group_admin.html', {
            'groups': groups,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            }, context_instance=RequestContext(request))


@login_required
@sys_staff_required
def sys_publink_admin(request):
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '100'))
    except ValueError:
        current_page = 1
        per_page = 100

    offset = per_page * (current_page -1)
    limit = per_page + 1
    publinks = FileShare.objects.all()[offset:offset+limit]

    if len(publinks) == per_page + 1:
        page_next = True
    else:
        page_next = False

    for l in publinks:
        if l.s_type == 'f':
            l.name = os.path.basename(l.path)
        else:
            l.name = os.path.dirname(l.path)

    return render_to_response(
        'sysadmin/sys_publink_admin.html', {
            'publinks': publinks,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        },
        context_instance=RequestContext(request))

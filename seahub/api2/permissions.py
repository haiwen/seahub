"""
Provides a set of pluggable permission policies.
"""

from rest_framework.permissions import BasePermission

from seaserv import check_permission, is_repo_owner, ccnet_api

SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

class IsRepoWritable(BasePermission):
    """
    Allows access only for user who has write permission to the repo.
    """

    def has_permission(self, request, view, obj=None):
        if request.method in SAFE_METHODS:
            return True

        repo_id = view.kwargs.get('repo_id', '')
        user = request.user.username if request.user else ''

        if user and check_permission(repo_id, user) == 'rw':
            return True
        return False
    
class IsRepoAccessible(BasePermission):
    """
    Check whether user has Read or Write permission to a repo.
    """
    def has_permission(self, request, view, obj=None):
        repo_id = view.kwargs.get('repo_id', '')
        user = request.user.username if request.user else ''

        return True if check_permission(repo_id, user) else False

class IsRepoOwner(BasePermission):
    """
    Check whether user is the owner of a repo.
    """
    def has_permission(self, request, view, obj=None):
        repo_id = view.kwargs.get('repo_id', '')
        user = request.user.username if request.user else ''

        return True if is_repo_owner(user, repo_id) else False


class IsGroupMember(BasePermission):
    """
    Check whether user is in a group.
    """
    def has_permission(self, request, view, obj=None):
        group_id = int(view.kwargs.get('group_id', ''))
        username = request.user.username if request.user else ''
        return True if ccnet_api.is_group_user(group_id, username) else False


class CanInviteGuest(BasePermission):
    """Check user has permission to invite a guest.
    """
    def has_permission(self, request, *args, **kwargs):
        return request.user.permissions.can_invite_guest()

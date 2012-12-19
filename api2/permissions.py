"""
Provides a set of pluggable permission policies.
"""

from rest_framework.permissions import BasePermission

from seaserv import check_permission

class IsRepoWritable(BasePermission):
    """
    Allows access only for users who has write permission to the repo.
    """

    def has_permission(self, request, view, obj=None):
        repo_id = view.kwargs.get('repo_id', '')
        user = request.user.username if request.user else ''

        if user and check_permission(repo_id, user) == 'rw':
            return True
        return False

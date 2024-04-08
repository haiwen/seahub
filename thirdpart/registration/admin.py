from django.contrib import admin
from django.contrib.sites.shortcuts import get_current_site

from django.utils.translation import gettext_lazy as _

from registration.models import RegistrationProfile


@admin.register(RegistrationProfile)
class RegistrationAdmin(admin.ModelAdmin):
    actions = ['activate_users', 'resend_activation_email']
    list_display = ('user', 'activation_key_expired')
    raw_id_fields = ['user']
    search_fields = ('user__username', 'user__first_name')

    @admin.action(
        description=_("Activate users")
    )
    def activate_users(self, request, queryset):
        """
        Activates the selected users, if they are not alrady
        activated.
        
        """
        for profile in queryset:
            RegistrationProfile.objects.activate_user(profile.activation_key)

    @admin.action(
        description=_("Re-send activation emails")
    )
    def resend_activation_email(self, request, queryset):
        """
        Re-sends activation emails for the selected users.

        Note that this will *only* send activation emails for users
        who are eligible to activate; emails will not be sent to users
        whose activation keys have expired or who have already
        activated.
        
        """
        site = get_current_site(request)

        for profile in queryset:
            if not profile.activation_key_expired():
                profile.send_activation_email(site)



"""Django Admin Site configuration"""

# pylint: disable=R0904

from django.contrib import admin
from .models import TermsAndConditions, UserTermsAndConditions


@admin.register(TermsAndConditions)
class TermsAndConditionsAdmin(admin.ModelAdmin):
    """Sets up the custom Terms and Conditions admin display"""
    list_display = ('slug', 'name', 'date_active', 'version_number',)
    verbose_name = "Terms and Conditions"


@admin.register(UserTermsAndConditions)
class UserTermsAndConditionsAdmin(admin.ModelAdmin):
    """Sets up the custom User Terms and Conditions admin display"""
    #fields = ('terms', 'user', 'date_accepted', 'ip_address',)
    readonly_fields = ('date_accepted',)
    list_display = ('terms', 'user', 'date_accepted', 'ip_address',)
    date_hierarchy = 'date_accepted'
    list_select_related = True



"""Django Models for TermsAndConditions App"""

# pylint: disable=C1001,E0202,W0613
from collections import OrderedDict

from django.db import models
from django.conf import settings
from django.http import Http404
from django.utils import timezone
import logging

from seahub.base.fields import LowerCaseCharField

LOGGER = logging.getLogger(name='termsandconditions')

DEFAULT_TERMS_SLUG = getattr(settings, 'DEFAULT_TERMS_SLUG', 'site-terms')


class UserTermsAndConditions(models.Model):
    """Holds mapping between TermsAndConditions and Users"""
    username = LowerCaseCharField(max_length=255)
    terms = models.ForeignKey("TermsAndConditions", on_delete=models.CASCADE, related_name="userterms")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP Address')
    date_accepted = models.DateTimeField(auto_now_add=True, verbose_name='Date Accepted')

    class Meta:
        """Model Meta Information"""
        get_latest_by = 'date_accepted'
        verbose_name = 'User Terms and Conditions'
        verbose_name_plural = 'User Terms and Conditions'
        unique_together = ('username', 'terms',)


class TermsAndConditions(models.Model):
    """Holds Versions of TermsAndConditions
    Active one for a given slug is: date_active is not Null and is latest not in future"""
    slug = models.SlugField(default=DEFAULT_TERMS_SLUG)
    name = models.TextField(max_length=255)
    # users = models.ManyToManyField(settings.AUTH_USER_MODEL, through=UserTermsAndConditions, blank=True)
    version_number = models.DecimalField(default=1.0, decimal_places=2, max_digits=6)
    text = models.TextField(null=True, blank=True)
    info = models.TextField(null=True, blank=True, help_text="Provide users with some info about what's changed and why")
    date_active = models.DateTimeField(blank=True, null=True, help_text="Leave Null To Never Make Active")
    date_created = models.DateTimeField(blank=True, auto_now_add=True)

    class Meta:
        """Model Meta Information"""
        ordering = ['-date_active', ]
        get_latest_by = 'date_active'
        verbose_name = 'Terms and Conditions'
        verbose_name_plural = 'Terms and Conditions'

    def __str__(self):
        return "{0}-{1:.2f}".format(self.slug, self.version_number)

    @staticmethod
    def create_default_terms():
        """Create a default TermsAndConditions Object"""
        default_terms = TermsAndConditions.objects.create(
            slug=DEFAULT_TERMS_SLUG,
            name=DEFAULT_TERMS_SLUG,
            date_active=timezone.now(),
            version_number=1,
            text=DEFAULT_TERMS_SLUG + " Text. CHANGE ME.")
        return default_terms

    @staticmethod
    def get_active(slug=DEFAULT_TERMS_SLUG):
        """Finds the latest of a particular terms and conditions"""

        try:
            active_terms = TermsAndConditions.objects.filter(
                date_active__isnull=False,
                date_active__lte=timezone.now(),
                slug=slug).latest('date_active')
        except TermsAndConditions.DoesNotExist:
            raise Http404

        return active_terms

    @staticmethod
    def get_active_list():
        """Finds the latest of all terms and conditions"""
        terms_list = {}
        try:
            all_terms_list = TermsAndConditions.objects.filter(
                date_active__isnull=False,
                date_active__lte=timezone.now()).order_by('slug')
            for term in all_terms_list:
                terms_list.update({term.slug: TermsAndConditions.get_active(slug=term.slug)})
        except TermsAndConditions.DoesNotExist:  # pragma: nocover
            terms_list.update({DEFAULT_TERMS_SLUG: TermsAndConditions.create_default_terms()})

        terms_list = OrderedDict(sorted(list(terms_list.items()), key=lambda t: t[0]))
        return terms_list

    @staticmethod
    def agreed_to_latest(user, slug=DEFAULT_TERMS_SLUG):
        """Checks to see if a specified user has agreed to the latest of a particular terms and conditions"""

        try:
            UserTermsAndConditions.objects.get(username=user.username, terms=TermsAndConditions.get_active(slug))
            return True
        except UserTermsAndConditions.MultipleObjectsReturned:  # pragma: nocover
            return True
        except UserTermsAndConditions.DoesNotExist:
            return False

    @staticmethod
    def agreed_to_terms(user, terms=None):
        """Checks to see if a specified user has agreed to a specific terms and conditions"""

        try:
            UserTermsAndConditions.objects.get(user=user, terms=terms)
            return True
        except UserTermsAndConditions.DoesNotExist:
            return False

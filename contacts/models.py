from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import ugettext_lazy as _


class Contact(models.Model):
    """Record user's contacts."""
    
    owner = models.ForeignKey(User, related_name="contacts")
    user = models.ForeignKey(User, related_name="contacts2me")


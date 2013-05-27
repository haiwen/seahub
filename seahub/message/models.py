# -*- coding: utf-8 -*-
import datetime
from django import forms
from django.db import models
from django.db.models import Q
from django.forms import ModelForm
from django.utils.translation import ugettext as _


class UserMessageManager(models.Manager):
    def get_messages_related_to_user(self, username):
        """List all messages related to the user, including he/she send to
        others and others send to he/she.
        """
        return super(UserMessageManager, self).filter(
            Q(to_email=username)|Q(from_email=username)).order_by('to_email')

    def get_messages_between_users(self, user1, user2):
        """List messages between two users.
        """
        return super(UserMessageManager, self).filter(
            (Q(from_email=user1)&Q(to_email=user2)) |
            (Q(from_email=user2)&Q(to_email=user1))).order_by('-timestamp')

    def add_unread_message(self, user1, user2, msg):
        """Add a new message sent from ``user1`` to ``user2``.
        """
        new_msg = self.model(from_email=user1, to_email=user2, message=msg,
                             ifread=0)
        new_msg.save(using=self._db)
        return new_msg
    
    def update_unread_messages(self, user1, user2):
        """Set ``ifread`` field to 1 for all messages that from ``user1``
        to ``user2``.
        """
        super(UserMessageManager, self).filter(
            Q(from_email=user1)&Q(to_email=user2)&Q(ifread=0)
            ).update(ifread=1)

    def count_unread_messages_by_user(self, user):
        """Count a user's unread messages.
        """
        return super(UserMessageManager, self).filter(to_email=user,
                                                      ifread=0).count()
        

class UserMessage(models.Model):
    message_id = models.AutoField(primary_key=True)
    message    = models.CharField(max_length=512)
    from_email = models.EmailField(db_index=True)
    to_email   = models.EmailField(db_index=True)
    timestamp  = models.DateTimeField(default=datetime.datetime.now)
    ifread     = models.BooleanField()
    objects = UserMessageManager()

    def __unicode__(self):
        return "%s|%s|%s" % (self.from_email, self.to_email, self.message)

# class MessageAddForm(ModelForm):
#     from_email = forms.EmailField()
#     to_email   = forms.EmailField()

#     def clean(self):
#         if not 'to_email' in self.cleaned_data:
#             raise forms.ValidationError(_('Email is required.'))
            
#         from_email = self.cleaned_data['from_email']
#         to_email = self.cleaned_data['to_email']

#         if to_email == from_email:
#             raise forms.ValidationError(_("You can't send to yourself."))
#         else:
#             return self.cleaned_data

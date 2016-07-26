# Copyright (c) 2012-2016 Seafile Ltd.
from signals import mail_sended

from models import Contact
def mail_sended_cb(sender, **kwargs):
    """
    Callback function to add email to contacts.
    """
    
    user = kwargs['user']
    email = kwargs['email']

    try:
        Contact.objects.get(user_email=user, contact_email=email)
        # Already in contacts list, pass.
    except Contact.DoesNotExist:
        # Add new contact
        c = Contact(user_email=user, contact_email=email)
        c.save()

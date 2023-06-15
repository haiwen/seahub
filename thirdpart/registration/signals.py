from django.dispatch import Signal


# A new user has registered.
user_registered = Signal()

# A user has activated his or her account.
user_activated = Signal()

user_deleted = Signal()

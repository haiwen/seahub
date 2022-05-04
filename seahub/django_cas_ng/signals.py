
from django import dispatch

cas_user_authenticated = dispatch.Signal(
    providing_args=['user', 'created', 'attributes', 'ticket', 'service', 'request'],
)

cas_user_logout = dispatch.Signal(
    providing_args=['user', 'session', 'ticket'],
)

from django import dispatch
cas_user_authenticated = dispatch.Signal()
cas_user_logout = dispatch.Signal()

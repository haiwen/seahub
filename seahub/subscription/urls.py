from django.urls import re_path
from .views import subscription_view, subscription_pay_view

urlpatterns = [
    re_path(r'^$', subscription_view, name="subscription"),
    re_path(r'pay/$', subscription_pay_view, name="subscription-pay"),
]

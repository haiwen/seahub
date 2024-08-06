# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path
from django.views.generic import TemplateView

urlpatterns = [
    path('', TemplateView.as_view(template_name="terms-of-service/terms-of-service.html")),
]

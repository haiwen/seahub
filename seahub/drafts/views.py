# -*- coding: utf-8 -*-

from django.shortcuts import render

from seahub.auth.decorators import login_required


@login_required
def drafts(request):
    return render(request, "react_app.html")


@login_required
def review(request, pk):
    return render(request, "draft_review.html")

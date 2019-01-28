# Copyright (c) 2012-2017 Seafile Ltd.

import datetime

from django.db import models
from django.conf import settings

COPYRIGHT_ISSUE = 'copyright'
VIRUS_ISSUE = 'virus'
ILLEGAL_CONTENT_ISSUE = 'illegal_content'
OTHER_ISSUE = 'other'

class IllegalReportManager(models.Manager):

    def add_illegal_report(self, reporter, repo_id, repo_name, file_path,
            illegal_type, description=None):

        model= super(IllegalReportManager, self).create(
                reporter=reporter, repo_id=repo_id, repo_name=repo_name,
                file_path=file_path, illegal_type=illegal_type,
                description=description)

        model.save()

        return model

    def get_illegal_report_by_id(self, pk):

        try:
            report = super(IllegalReportManager, self).get(id=pk)
        except IllegalReport.DoesNotExist:
            return None

        return report

    def get_illegal_reports(self, illegal_type=None, handled=None):

        reports = super(IllegalReportManager, self).all()

        if illegal_type:
            reports = reports.filter(illegal_type=illegal_type)

        if handled in (True, False):
            reports = reports.filter(handled=handled)

        return reports

class IllegalReport(models.Model):

    ILLEGAL_TYPE_CHOICES = (
        (COPYRIGHT_ISSUE, 'copyright'),
        (VIRUS_ISSUE, 'virus'),
        (ILLEGAL_CONTENT_ISSUE, 'illegal_content'),
        (OTHER_ISSUE, 'other'),
    )

    reporter = models.TextField(blank=True, null=True)
    repo_id = models.CharField(max_length=36)
    repo_name = models.CharField(max_length=settings.MAX_FILE_NAME)
    file_path = models.TextField(blank=True, null=True)
    illegal_type = models.CharField(max_length=255,
            db_index=True, choices=ILLEGAL_TYPE_CHOICES,)
    description = models.TextField(blank=True, null=True)
    handled = models.BooleanField(default=False, db_index=True)
    time = models.DateTimeField(default=datetime.datetime.now)

    objects = IllegalReportManager()

    class Meta:
        ordering = ["-time"]

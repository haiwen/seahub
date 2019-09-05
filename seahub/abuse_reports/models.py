# Copyright (c) 2012-2017 Seafile Ltd.

import datetime

from django.db import models
from django.conf import settings

COPYRIGHT_ISSUE = 'copyright'
VIRUS_ISSUE = 'virus'
ABUSE_CONTENT_ISSUE = 'abuse_content'
OTHER_ISSUE = 'other'


class AbuseReportManager(models.Manager):

    def add_abuse_report(self, reporter, repo_id, repo_name, file_path,
                         abuse_type, description=None):

        model = super(AbuseReportManager, self).create(
            reporter=reporter, repo_id=repo_id, repo_name=repo_name,
            file_path=file_path, abuse_type=abuse_type,
            description=description)

        model.save()

        return model

    def get_abuse_report_by_id(self, pk):

        try:
            report = super(AbuseReportManager, self).get(id=pk)
        except AbuseReport.DoesNotExist:
            return None

        return report

    def get_abuse_reports(self, abuse_type=None, handled=None):

        reports = super(AbuseReportManager, self).all()

        if abuse_type:
            reports = reports.filter(abuse_type=abuse_type)

        if handled in (True, False):
            reports = reports.filter(handled=handled)

        return reports


class AbuseReport(models.Model):
    ABUSE_TYPE_CHOICES = (
        (COPYRIGHT_ISSUE, 'copyright'),
        (VIRUS_ISSUE, 'virus'),
        (ABUSE_CONTENT_ISSUE, 'abuse_content'),
        (OTHER_ISSUE, 'other'),
    )

    reporter = models.TextField(blank=True, null=True)
    repo_id = models.CharField(max_length=36)
    repo_name = models.CharField(max_length=settings.MAX_FILE_NAME)
    file_path = models.TextField(blank=True, null=True)
    abuse_type = models.CharField(max_length=255,
                                  db_index=True, choices=ABUSE_TYPE_CHOICES, )
    description = models.TextField(blank=True, null=True)
    handled = models.BooleanField(default=False, db_index=True)
    time = models.DateTimeField(default=datetime.datetime.now)

    objects = AbuseReportManager()

    class Meta:
        ordering = ["-time"]

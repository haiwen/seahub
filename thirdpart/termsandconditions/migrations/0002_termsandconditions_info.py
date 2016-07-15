# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('termsandconditions', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='termsandconditions',
            name='info',
            field=models.TextField(
                help_text=b"Provide users with some info about "
                          b"what's changed and why", null=True, blank=True),
            preserve_default=True,
        ),
    ]

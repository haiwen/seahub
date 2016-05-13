# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import datetime


class Migration(migrations.Migration):

    dependencies = [
        ('invitations', '0003_auto_20160510_1703'),
    ]

    operations = [
        migrations.AddField(
            model_name='invitation',
            name='expire_date',
            field=models.DateTimeField(default=datetime.datetime(2016, 6, 29, 16, 10, 45, 816971)),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='invitation',
            name='invite_type',
            field=models.CharField(default='Guest', max_length=20, choices=[('Guest', 'Guest')]),
        ),
    ]

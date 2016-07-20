# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invitations', '0004_auto_20160629_1610'),
    ]

    operations = [
        migrations.RenameField(
            model_name='invitation',
            old_name='expire_date',
            new_name='expire_time',
        ),
    ]

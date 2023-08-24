# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import datetime


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='TrashCleanedItems',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('repo_id', models.CharField(max_length=36, db_index=True)),
                ('path', models.TextField()),
                ('datetime', models.DateTimeField(default=datetime.datetime.now, db_index=True)),
            ],
            options={
                'ordering': ['-datetime'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='trashcleaneditems',
            unique_together=set([('repo_id', 'datetime')]),
        ),
    ]

# -*- coding: utf-8 -*-


from django.db import migrations, models
import datetime


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='AdminLog',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('email', models.EmailField(max_length=254, db_index=True)),
                ('operation', models.CharField(max_length=255, db_index=True)),
                ('detail', models.TextField()),
                ('datetime', models.DateTimeField(default=datetime.datetime.now)),
            ],
            options={
                'ordering': ['-datetime'],
            },
        ),
    ]

# Generated by Django 4.2.2 on 2024-08-27 14:16

import datetime
from django.db import migrations, models
import seahub.avatar.models
import seahub.base.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Avatar',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('emailuser', seahub.base.fields.LowerCaseCharField(max_length=255)),
                ('primary', models.BooleanField(default=False)),
                ('avatar', models.ImageField(blank=True, max_length=1024, upload_to=seahub.avatar.models.avatar_file_path)),
                ('date_uploaded', models.DateTimeField(default=datetime.datetime.now)),
            ],
            bases=(models.Model, seahub.avatar.models.AvatarBase),
        ),
        migrations.CreateModel(
            name='GroupAvatar',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('group_id', models.CharField(max_length=255)),
                ('avatar', models.ImageField(blank=True, max_length=1024, upload_to=seahub.avatar.models.avatar_file_path)),
                ('date_uploaded', models.DateTimeField(default=datetime.datetime.now)),
            ],
            bases=(models.Model, seahub.avatar.models.AvatarBase),
        ),
    ]

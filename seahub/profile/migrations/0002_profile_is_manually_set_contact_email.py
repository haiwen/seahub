# Generated by Django 4.2.16 on 2024-12-31 08:03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profile', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='is_manually_set_contact_email',
            field=models.BooleanField(default=False),
        ),
    ]
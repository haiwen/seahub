# Generated by Django 4.2.16 on 2025-06-03 06:51

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0002_orgsettings_is_active'),
    ]

    operations = [
        migrations.AlterField(
            model_name='orgsettings',
            name='is_active',
            field=models.BooleanField(db_index=True, default=True),
        ),
    ]

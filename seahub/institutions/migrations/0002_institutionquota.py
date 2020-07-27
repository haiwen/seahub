# -*- coding: utf-8 -*-


from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('institutions', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='InstitutionQuota',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('quota', models.BigIntegerField()),
                ('institution', models.ForeignKey(to='institutions.Institution', on_delete=models.CASCADE)),
            ],
        ),
    ]

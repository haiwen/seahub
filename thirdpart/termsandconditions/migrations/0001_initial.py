# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TermsAndConditions',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('slug', models.SlugField(default=b'site-terms')),
                ('name', models.TextField(max_length=255)),
                ('version_number', models.DecimalField(default=1.0, max_digits=6, decimal_places=2)),
                ('text', models.TextField(null=True, blank=True)),
                ('date_active', models.DateTimeField(help_text=b'Leave Null To Never Make Active', null=True, blank=True)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-date_active'],
                'get_latest_by': 'date_active',
                'verbose_name': 'Terms and Conditions',
                'verbose_name_plural': 'Terms and Conditions',
            },
        ),
        migrations.CreateModel(
            name='UserTermsAndConditions',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('ip_address', models.GenericIPAddressField(null=True, verbose_name=b'IP Address', blank=True)),
                ('date_accepted', models.DateTimeField(auto_now_add=True, verbose_name=b'Date Accepted')),
                ('terms', models.ForeignKey(related_name='userterms', to='termsandconditions.TermsAndConditions')),
                ('user', models.ForeignKey(related_name='userterms', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'get_latest_by': 'date_accepted',
                'verbose_name': 'User Terms and Conditions',
                'verbose_name_plural': 'User Terms and Conditions',
            },
        ),
        migrations.AddField(
            model_name='termsandconditions',
            name='users',
            field=models.ManyToManyField(to=settings.AUTH_USER_MODEL, through='termsandconditions.UserTermsAndConditions', blank=True),
        ),
        migrations.AlterUniqueTogether(
            name='usertermsandconditions',
            unique_together=set([('user', 'terms')]),
        ),
    ]

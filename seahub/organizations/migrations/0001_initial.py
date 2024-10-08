# Generated by Django 4.2.2 on 2024-08-27 14:16

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='OrgMemberQuota',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('org_id', models.IntegerField(db_index=True)),
                ('quota', models.IntegerField()),
            ],
        ),
        migrations.CreateModel(
            name='OrgSAMLConfig',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('org_id', models.IntegerField(unique=True)),
                ('metadata_url', models.TextField()),
                ('domain', models.CharField(blank=True, max_length=255, null=True, unique=True)),
                ('dns_txt', models.CharField(blank=True, max_length=64, null=True)),
                ('domain_verified', models.BooleanField(db_index=True, default=False)),
                ('idp_certificate', models.TextField(blank=True, null=True)),
            ],
            options={
                'db_table': 'org_saml_config',
            },
        ),
        migrations.CreateModel(
            name='OrgSettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('org_id', models.IntegerField(unique=True)),
                ('role', models.CharField(blank=True, max_length=100, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='OrgAdminSettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('org_id', models.IntegerField(db_index=True)),
                ('key', models.CharField(max_length=255)),
                ('value', models.TextField()),
            ],
            options={
                'unique_together': {('org_id', 'key')},
            },
        ),
    ]

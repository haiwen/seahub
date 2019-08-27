# -*- coding: utf-8 -*-


from django.db import migrations, models
import seahub.base.fields
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('wiki', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Wiki',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('username', seahub.base.fields.LowerCaseCharField(max_length=255)),
                ('name', models.CharField(max_length=255)),
                ('slug', models.CharField(unique=True, max_length=255)),
                ('repo_id', models.CharField(max_length=36)),
                ('permission', models.CharField(max_length=50)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now, db_index=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='wiki',
            unique_together={('username', 'repo_id')},
        ),
    ]

# Generated by Django 4.2.16 on 2024-12-31 08:03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wiki2', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Wiki2Publish',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('repo_id', models.CharField(db_index=True, max_length=36, unique=True)),
                ('publish_url', models.CharField(max_length=40, null=True, unique=True)),
                ('username', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('visit_count', models.IntegerField(default=0)),
            ],
            options={
                'db_table': 'wiki_wiki2_publish',
            },
        ),
    ]
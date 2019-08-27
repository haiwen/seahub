# -*- coding: utf-8 -*-


from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invitations', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='invitation',
            name='invite_type',
            field=models.CharField(default=b'guest', max_length=20, choices=[(b'guest', b'guest')]),
        ),
    ]

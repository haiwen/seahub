# -*- coding: utf-8 -*-


from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invitations', '0002_invitation_invite_type'),
    ]

    operations = [
        migrations.RenameField(
            model_name='invitation',
            old_name='acceptor',
            new_name='accepter',
        ),
        migrations.AlterField(
            model_name='invitation',
            name='token',
            field=models.CharField(max_length=40, db_index=True),
        ),
    ]

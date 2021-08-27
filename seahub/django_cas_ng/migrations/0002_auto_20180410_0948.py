# -*- coding: utf-8 -*-


from django.db import migrations, models
import seahub.base.fields


class Migration(migrations.Migration):

    dependencies = [
        ('django_cas_ng', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='proxygrantingticket',
            name='user',
            field=seahub.base.fields.LowerCaseCharField(default='', max_length=255, db_index=True),
            preserve_default=False,
        ),
    ]

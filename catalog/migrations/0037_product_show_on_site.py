# Generated by Django 4.1.7 on 2023-11-11 18:53

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0036_rename_filter_colorofstone_name_of_filter'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='show_on_site',
            field=models.BooleanField(db_index=True, default=True, verbose_name='Показывать на сайте'),
        ),
    ]

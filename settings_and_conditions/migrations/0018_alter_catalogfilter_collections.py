# Generated by Django 4.1.7 on 2024-10-23 14:36

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings_and_conditions', '0017_banner'),
    ]

    operations = [
        migrations.AlterField(
            model_name='catalogfilter',
            name='collections',
            field=models.BooleanField(default=True, verbose_name='группы товаров'),
        ),
    ]

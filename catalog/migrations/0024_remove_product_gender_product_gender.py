# Generated by Django 4.1.7 on 2023-09-08 16:07

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0023_rename_color_gemset_gem_color_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='product',
            name='gender',
        ),
        migrations.AddField(
            model_name='product',
            name='gender',
            field=models.ManyToManyField(related_name='products_by_gender', to='catalog.gender', verbose_name='Гендер'),
        ),
    ]

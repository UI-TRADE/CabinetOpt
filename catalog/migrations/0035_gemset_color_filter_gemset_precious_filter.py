# Generated by Django 4.1.7 on 2023-11-06 13:02

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0034_colorofstone_style_cuttype_image_product_style'),
    ]

    operations = [
        migrations.AddField(
            model_name='gemset',
            name='color_filter',
            field=models.CharField(blank=True, db_index=True, max_length=50, verbose_name='Группа расцветки'),
        ),
        migrations.AddField(
            model_name='gemset',
            name='precious_filter',
            field=models.CharField(blank=True, db_index=True, max_length=50, verbose_name='Тип камня'),
        ),
    ]

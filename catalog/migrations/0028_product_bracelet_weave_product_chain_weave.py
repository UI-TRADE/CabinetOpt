# Generated by Django 4.1.7 on 2023-09-10 06:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0027_design_gift_product_bracelet_width_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='bracelet_weave',
            field=models.CharField(blank=True, db_index=True, max_length=50, verbose_name='Плетение (для браслетов)'),
        ),
        migrations.AddField(
            model_name='product',
            name='chain_weave',
            field=models.CharField(blank=True, db_index=True, max_length=50, verbose_name='Плетение (для цепей)'),
        ),
    ]

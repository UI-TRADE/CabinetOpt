# Generated by Django 4.1.7 on 2023-09-11 07:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0028_product_bracelet_weave_product_chain_weave'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='mark_description',
            field=models.TextField(blank=True, verbose_name='Маркетинговое описание'),
        ),
    ]

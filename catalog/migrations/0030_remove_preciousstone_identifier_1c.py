# Generated by Django 4.1.7 on 2023-09-12 09:34

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0029_product_mark_description'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='preciousstone',
            name='identifier_1C',
        ),
    ]

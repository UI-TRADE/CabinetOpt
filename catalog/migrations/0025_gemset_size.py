# Generated by Django 4.1.7 on 2023-09-09 16:43

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0024_remove_product_gender_product_gender'),
    ]

    operations = [
        migrations.AddField(
            model_name='gemset',
            name='size',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='product_sizes', to='catalog.size', verbose_name='Размер'),
        ),
    ]

# Generated by Django 4.1.7 on 2023-07-15 08:47

import django.core.validators
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0007_delete_productcost'),
    ]

    operations = [
        migrations.AlterField(
            model_name='price',
            name='start_at',
            field=models.DateTimeField(db_index=True, default=django.utils.timezone.now, verbose_name='Дата начала действия'),
        ),
        migrations.AlterField(
            model_name='stockandcost',
            name='cost',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Максимальная цена за грамм'),
        ),
    ]
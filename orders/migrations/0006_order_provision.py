# Generated by Django 4.1.7 on 2023-10-03 12:05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_alter_order_options_order_identifier_1c_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='provision',
            field=models.CharField(choices=[('П', 'Поставка'), ('З', 'Заказ')], db_index=True, default='П', max_length=1, verbose_name='Обеспечение'),
        ),
    ]

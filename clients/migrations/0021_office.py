# Generated by Django 4.1.7 on 2025-03-14 18:59

from django.db import migrations, models
import django.db.models.deletion
import phonenumber_field.modelfields


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0020_alter_customersegments_client'),
    ]

    operations = [
        migrations.CreateModel(
            name='Office',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('address', models.CharField(blank=True, default='', max_length=250, verbose_name='Адерс')),
                ('phone', phonenumber_field.modelfields.PhoneNumberField(db_index=True, max_length=128, region=None, verbose_name='Телефон')),
                ('email', models.EmailField(db_index=True, max_length=254, verbose_name='email')),
                ('lng', models.FloatField(default=0.0, verbose_name='Долгота')),
                ('lat', models.FloatField(default=0.0, verbose_name='Широта')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='offices', to='clients.organization', verbose_name='Организация')),
            ],
            options={
                'verbose_name': 'Адрес',
                'verbose_name_plural': 'Наши офисы',
            },
        ),
    ]

# Generated by Django 4.1.7 on 2023-09-24 16:17

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import phonenumber_field.modelfields


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('clients', '0005_rename_inn_registrationorder_identification_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='registrationorder',
            name='manager_talant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='managers_talant', to=settings.AUTH_USER_MODEL, verbose_name='менеджер TALANT'),
        ),
        migrations.AlterField(
            model_name='registrationorder',
            name='email',
            field=models.EmailField(db_index=True, max_length=254, verbose_name='email менеджера клиента'),
        ),
        migrations.AlterField(
            model_name='registrationorder',
            name='name_of_manager',
            field=models.CharField(blank=True, max_length=150, verbose_name='ФИО менеджера клиента'),
        ),
        migrations.AlterField(
            model_name='registrationorder',
            name='phone',
            field=phonenumber_field.modelfields.PhoneNumberField(db_index=True, max_length=128, region=None, verbose_name='Телефон менеджера клиента'),
        ),
    ]
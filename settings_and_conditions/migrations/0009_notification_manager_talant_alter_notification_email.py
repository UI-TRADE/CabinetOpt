# Generated by Django 4.2.11 on 2024-03-27 09:58

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('settings_and_conditions', '0008_notificationtype_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='manager_talant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notified_managers', to=settings.AUTH_USER_MODEL, verbose_name='Менеджер ЮИ-Трейд'),
        ),
        migrations.AlterField(
            model_name='notification',
            name='email',
            field=models.EmailField(blank=True, db_index=True, max_length=254, verbose_name='email'),
        ),
    ]

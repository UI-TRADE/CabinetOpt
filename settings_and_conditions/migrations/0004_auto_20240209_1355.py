# Generated by Django 4.1.7 on 2024-02-09 10:55

from django.db import migrations


def add_default_notification(apps, schema_editor):
    Notification = apps.get_model("settings_and_conditions", "Notification")

    new_obj = Notification(email='Chikunova.Anastasiya@talant-gold.ru', notification_type='confirm_registration')
    new_obj.save()

    new_obj = Notification(email='opt@talant-gold.ru', notification_type='confirm_registration')
    new_obj.save()

    new_obj = Notification(email='Chikunova.Anastasiya@talant-gold.ru', notification_type='confirm_order')
    new_obj.save()


class Migration(migrations.Migration):

    dependencies = [
        ('settings_and_conditions', '0003_notification'),
    ]

    operations = [
        migrations.RunPython(add_default_notification),
    ]
# Generated by Django 4.1.7 on 2023-03-30 19:34

from django.db import migrations


def fill_priority_directions(apps, schema_editor):
    PriorityDirection = apps.get_model('clients', 'PriorityDirection')
    PriorityDirection.objects.get_or_create(name="Talant")
    PriorityDirection.objects.get_or_create(name="Салам")
    PriorityDirection.objects.get_or_create(name="Diamonds")
    PriorityDirection.objects.get_or_create(name="Silver")


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(fill_priority_directions),
    ]

# Generated by Django 4.1.7 on 2023-10-09 16:54

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_remove_customuser_priority_direction'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='customuser',
            options={'verbose_name': 'Менеджер ЮИ-Трейд', 'verbose_name_plural': 'Менеджеры ЮИ-Трейд'},
        ),
    ]

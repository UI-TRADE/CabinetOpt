# Generated by Django 4.2.11 on 2024-03-27 19:07

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0011_alter_organization_options'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='manager',
            options={'ordering': ('name',), 'verbose_name': 'Менеджер клиента', 'verbose_name_plural': 'Менеджеры клиента'},
        ),
        migrations.RemoveField(
            model_name='manager',
            name='first_name',
        ),
        migrations.RemoveField(
            model_name='manager',
            name='last_name',
        ),
        migrations.RemoveField(
            model_name='manager',
            name='surname',
        ),
        migrations.AddField(
            model_name='manager',
            name='name',
            field=models.CharField(blank=True, max_length=150, verbose_name='ФИО'),
        ),
    ]
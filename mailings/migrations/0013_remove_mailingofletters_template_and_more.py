# Generated by Django 4.2.11 on 2024-07-16 09:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mailings', '0012_remove_notifytemplate_template_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='mailingofletters',
            name='template',
        ),
        migrations.AddField(
            model_name='mailingofletters',
            name='content',
            field=models.TextField(blank=True, verbose_name='Содержание'),
        ),
    ]

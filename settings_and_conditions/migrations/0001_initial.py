# Generated by Django 4.1.7 on 2024-02-08 09:47

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('clients', '0011_alter_organization_options'),
    ]

    operations = [
        migrations.CreateModel(
            name='Guarantee',
            fields=[
                ('organization', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, related_name='organizations', serialize=False, to='clients.organization', verbose_name='Организация')),
                ('guarantee', models.TextField(blank=True, verbose_name='')),
            ],
            options={
                'verbose_name': 'Гарантия и возврат',
                'verbose_name_plural': 'Гарантии и возвраты',
            },
        ),
    ]

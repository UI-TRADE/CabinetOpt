# Generated by Django 4.2.11 on 2024-06-17 20:45

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0017_alter_organization_additional_email'),
    ]

    operations = [
        migrations.AlterField(
            model_name='manager',
            name='email',
            field=models.EmailField(db_index=True, error_messages={'unique': 'A user with that email already exists.'}, max_length=254, unique=True, verbose_name='email'),
        ),
        migrations.AlterField(
            model_name='manager',
            name='login',
            field=models.CharField(help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.', max_length=150, verbose_name='Логин'),
        ),
    ]

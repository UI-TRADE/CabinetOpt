# Generated by Django 4.1.7 on 2023-08-22 11:13

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0003_alter_prioritydirection_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='registrationorder',
            name='organization',
            field=models.CharField(db_index=True, default='', max_length=150, verbose_name='Организация'),
        ),
        migrations.AlterField(
            model_name='registrationorder',
            name='name',
            field=models.CharField(max_length=150, verbose_name='Имя'),
        ),
    ]

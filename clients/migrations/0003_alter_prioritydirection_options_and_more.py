# Generated by Django 4.1.7 on 2023-07-10 06:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0002_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='prioritydirection',
            options={'verbose_name': 'Бренд', 'verbose_name_plural': 'Бренды'},
        ),
        migrations.AlterField(
            model_name='prioritydirection',
            name='name',
            field=models.CharField(max_length=50, verbose_name='Наименование'),
        ),
    ]
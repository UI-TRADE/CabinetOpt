# Generated by Django 4.1.7 on 2023-12-25 17:53

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0043_auto_20231225_1809'),
    ]

    operations = [
        migrations.AddField(
            model_name='cuttype',
            name='cut_type_image',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cut_type_images', to='catalog.cuttypeimage', verbose_name='Изображение'),
        ),
    ]

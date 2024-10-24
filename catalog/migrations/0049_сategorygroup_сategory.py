# Generated by Django 4.1.7 on 2024-10-15 09:50

import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0048_productimage_order'),
    ]

    operations = [
        migrations.CreateModel(
            name='СategoryGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(db_index=True, max_length=100, verbose_name='Наименование')),
                ('order', models.PositiveIntegerField(default=1, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Порядок')),
            ],
            options={
                'verbose_name': 'Коллекция',
                'verbose_name_plural': 'Коллекции',
            },
        ),
        migrations.CreateModel(
            name='Сategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(db_index=True, max_length=100, verbose_name='Наименование')),
                ('discount', models.DecimalField(decimal_places=2, default=0, max_digits=8, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Скидка')),
                ('identifier_1C', models.CharField(blank=True, db_index=True, max_length=50, verbose_name='Идентификатор 1С')),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='сategories', to='catalog.сategorygroup', verbose_name='Группа')),
            ],
            options={
                'verbose_name': 'Вид коллекции',
                'verbose_name_plural': 'Виды коллекций',
            },
        ),
    ]

# Generated by Django 4.1.7 on 2023-07-08 12:22

import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Collection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(db_index=True, max_length=100, verbose_name='Наименование')),
                ('discount', models.DecimalField(decimal_places=2, default=0, max_digits=8, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Скидка')),
                ('identifier_1C', models.CharField(blank=True, db_index=True, max_length=50, verbose_name='Идентификатор 1С')),
            ],
            options={
                'verbose_name': 'Коллекция',
                'verbose_name_plural': 'Коллекции',
            },
        ),
        migrations.CreateModel(
            name='Price',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('unit', models.CharField(choices=[('796', 'штук'), ('163', 'грамм')], db_index=True, default='грамм', max_length=20, verbose_name='Единица измерения')),
                ('price', models.DecimalField(decimal_places=2, default=0, max_digits=8, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Цена')),
                ('discount', models.DecimalField(decimal_places=2, default=0, max_digits=8, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Скидка')),
                ('start_at', models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='Дата начала действия')),
                ('end_at', models.DateTimeField(blank=True, db_index=True, null=True, verbose_name='Дата окончания действия')),
            ],
            options={
                'verbose_name': 'Цена',
                'verbose_name_plural': 'Цены',
            },
        ),
        migrations.CreateModel(
            name='PriceType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(db_index=True, max_length=100, verbose_name='Наименование')),
            ],
            options={
                'verbose_name': 'Тип цены',
                'verbose_name_plural': 'Типы цен',
            },
        ),
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(db_index=True, max_length=200, verbose_name='Наименование')),
                ('articul', models.CharField(blank=True, max_length=200, verbose_name='Артикул')),
                ('unit', models.CharField(choices=[('796', 'штук'), ('163', 'грамм')], db_index=True, default='грамм', max_length=20, verbose_name='Единица измерения')),
                ('price_per_gr', models.DecimalField(decimal_places=2, default=0, max_digits=8, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Цена за грамм')),
                ('weight', models.FloatField(default=0, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Вес')),
                ('size', models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Размер')),
                ('stock', models.PositiveIntegerField(default=0, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Остаток')),
                ('available_for_order', models.BooleanField(db_index=True, default=False, verbose_name='Доступен для заказа')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='Дата создания')),
                ('product_type', models.CharField(choices=[('product', 'товар'), ('service', 'услуга'), ('gift_сertificate', 'подарочный сертификат')], db_index=True, default='product', max_length=20, verbose_name='Тип номенклатуры')),
                ('metal', models.CharField(blank=True, db_index=True, max_length=50, verbose_name='Металл')),
                ('metal_content', models.CharField(blank=True, db_index=True, max_length=30, verbose_name='Проба')),
                ('gender', models.CharField(choices=[('М', 'мужской'), ('Ж', 'женский'), ('-', 'мужской, женский')], db_index=True, default='-', max_length=10, verbose_name='Гендер')),
                ('status', models.CharField(blank=True, choices=[('novelty', 'Новинка'), ('order', 'Заказ'), ('hit', 'Хит'), ('sale', 'Распродажа')], db_index=True, max_length=20, verbose_name='Статус')),
                ('identifier_1C', models.CharField(blank=True, db_index=True, max_length=50, verbose_name='Идентификатор 1С')),
            ],
            options={
                'verbose_name': 'Номенклатура',
                'verbose_name_plural': 'Номенкулатура',
            },
        ),
        migrations.CreateModel(
            name='ProductImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('filename', models.CharField(blank=True, db_index=True, max_length=100, verbose_name='Имя файла')),
                ('image', models.ImageField(upload_to='product_images', verbose_name='Фото номенклатуры')),
                ('product', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='product_images', to='catalog.product', verbose_name='Фото')),
            ],
            options={
                'verbose_name': 'Фотография',
                'verbose_name_plural': 'Фотографии',
            },
        ),
        migrations.CreateModel(
            name='ProductCost',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('weight', models.FloatField(default=0, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Вес')),
                ('size', models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Размер')),
                ('cost', models.DecimalField(decimal_places=2, default=0, max_digits=8, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Стоимость')),
                ('product', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='product_cost', to='catalog.product', verbose_name='Номенклатура')),
            ],
            options={
                'verbose_name': 'Стоимость изделия',
                'verbose_name_plural': 'Стоимость изделий',
            },
        ),
    ]

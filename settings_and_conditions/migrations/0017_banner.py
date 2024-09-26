# Generated by Django 4.2.11 on 2024-08-22 09:44

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings_and_conditions', '0016_notificationtype_template_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Banner',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(db_index=True, max_length=200, verbose_name='Наименование')),
                ('image', models.ImageField(upload_to='banner_images', verbose_name='Изображение')),
                ('link', models.URLField(blank=True, null=True, verbose_name='Ссылка')),
                ('description', models.TextField(blank=True, verbose_name='Описание')),
                ('priority', models.PositiveSmallIntegerField(choices=[(1, 'первый'), (2, 'второй')], db_index=True, default=1)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='Дата создания')),
            ],
            options={
                'verbose_name': 'Баннер',
                'verbose_name_plural': 'Баннеры',
            },
        ),
    ]
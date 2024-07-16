# Generated by Django 4.2.11 on 2024-07-16 10:17

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('mailings', '0013_remove_mailingofletters_template_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='mailingofletters',
            name='template',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='mailing_of_letter_templates', to='mailings.notifytemplate', verbose_name='Шаблон письма'),
        ),
        migrations.AlterField(
            model_name='mailingofletters',
            name='content',
            field=models.TextField(blank=True, verbose_name='Содержание письма'),
        ),
        migrations.AlterField(
            model_name='notifytemplate',
            name='footer_template',
            field=models.TextField(blank=True, verbose_name='Подвал письма'),
        ),
        migrations.AlterField(
            model_name='notifytemplate',
            name='header_template',
            field=models.TextField(blank=True, verbose_name='Заголовок письма'),
        ),
    ]

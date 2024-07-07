# Generated by Django 4.2.11 on 2024-07-03 09:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings_and_conditions', '0014_alter_notificationtype_event'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notificationtype',
            name='event',
            field=models.CharField(choices=[('registration_request', 'Получение заявки на регистрацию'), ('confirm_registration', 'Подтверждение регистрации на сайте'), ('cancel_registration', 'Отмена регистрации на сайте'), ('confirm_order', 'Подтверждение заказа клиента'), ('get_order', 'Заказ получен в 1С'), ('recovery_password', 'Запрос восстановления пароля'), ('locked_client', 'Временное отключение клиента от входа в ЛК'), ('add_manager', 'Добавление менеджера клиента')], db_index=True, max_length=50, verbose_name='Событие'),
        ),
    ]
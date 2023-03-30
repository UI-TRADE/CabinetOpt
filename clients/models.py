from django.db import models
from phonenumber_field.modelfields import PhoneNumberField


class PriorityDirection(models.Model):
    name = models.CharField('Приоритетное направление', max_length=50)

    class Meta:
        verbose_name = 'Приоритетное направление'
        verbose_name_plural = 'Приоритетные направления'

    def __str__(self):
        return self.name


class RegistrationOrder(models.Model):

    name = models.CharField('Организация', max_length=150)
    inn = models.CharField('ИНН', max_length=12, unique=True)
    manager = models.CharField('ФИО менеджера', max_length=150)
    email = models.EmailField('email менеджера', db_index=True)
    phone = PhoneNumberField('Контактный телефон менеджера', db_index=True)
    priority_direction = models.ForeignKey(
        PriorityDirection,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Приоритетное направление',
        related_name='registration_orders'
    )
    status = models.CharField(
        'Статус регистрации', max_length=10, default='pending', choices=(
            ('pending'   , 'Ожидает рассмотрения'),
            ('considered', 'Рассматривается'),
            ('registered', 'Зарегистрирован')
    ))
    created_at = models.DateTimeField(
        'Дата создания', db_index=True, auto_now_add=True
    )

    class Meta:
        verbose_name = 'Заявка на регистрацию'
        verbose_name_plural = 'Заявки на регистрацию'
    
    def __str__(self):
        return self.name

from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from phonenumber_field.modelfields import PhoneNumberField
from django.db.models import Sum


class PriorityDirection(models.Model):
    name = models.CharField('Приоритетное направление', max_length=50)

    class Meta:
        verbose_name = 'Приоритетное направление'
        verbose_name_plural = 'Приоритетные направления'

    def __str__(self):
        return self.name


class User(models.Model):
    """
    Модель хранит внутренних пользователей приложения, включая менеджеров, занимающихся
    оформлением клиентов и потдверждением заказов .
    """

    name = models.CharField('ФИО', max_length=150)
    email = models.EmailField('email', blank=True, db_index=True)
    phone = PhoneNumberField('Контактный телефон', db_index=True)
    gender = models.CharField(
        'Пол', max_length=10, default='male', choices=(
            ('male'  , 'Мужской'),
            ('female', 'Женский')
    ))
    date_of_birth = models.DateTimeField(
        'Дата рождения', blank=True, null=True, db_index=True
    )
    created_at = models.DateTimeField(
        'Дата создания', db_index=True, auto_now_add=True
    )
    priority_direction = models.ManyToManyField(
        PriorityDirection,
        blank=True,
        verbose_name='Приоритетное направление',
        related_name='users'
    )

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
    
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
  
import datetime
from django.db import models
from phonenumber_field.modelfields import PhoneNumberField
from django.conf import settings


class PriorityDirection(models.Model):
    name = models.CharField('Приоритетное направление', max_length=50)

    class Meta:
        verbose_name = 'Приоритетное направление'
        verbose_name_plural = 'Приоритетные направления'

    def __str__(self):
        return self.name


class RegistrationOrder(models.Model):

    name = models.CharField('Организация', max_length=150)
    inn = models.CharField('ИНН', max_length=12, db_index=True)
    name_of_manager = models.CharField('ФИО менеджера', max_length=150, blank=True)
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


class Manager(models.Model):
    last_name = models.CharField('Фамилия', max_length=150)
    first_name = models.CharField('Имя', max_length=150)
    surname = models.CharField('Отчество', max_length=150, blank=True)
    email = models.EmailField('email', db_index=True)
    phone = PhoneNumberField('Контактный телефон', db_index=True)
    login = models.CharField(
         error_messages={'unique': 'A user with that username already exists.'},
         help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.',
         max_length=150,
         unique=True,
         verbose_name='Логин'
    )
    password = models.CharField(max_length=128, verbose_name='Пароль')

    class Meta:
        verbose_name = 'Персональный менеджер'
        verbose_name_plural = 'Персональные менеджеры'
    
    def __str__(self):
        return f'{self.last_name} {self.first_name}'


class Client(models.Model):
    name = models.CharField('Организация', max_length=150)
    inn = models.CharField('ИНН', max_length=12, db_index=True)
    registration_order = models.ForeignKey(
        RegistrationOrder,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Заявка на регистрацию',
        related_name='clients'
    )
    created_at = models.DateTimeField(
        'Дата создания', db_index=True, auto_now_add=True
    )
    updated_at = models.DateTimeField(
        'Дата обновления', db_index=True, default=datetime.datetime.now
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Утвержден',
        related_name='approved_clients'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Изменен',
        related_name='updated_clients'
    )
    manager = models.ManyToManyField(
        Manager,
        verbose_name='Персональные менеджеры',
        related_name='clients_by_managers'
    )

    class Meta:
        verbose_name = 'Клиент'
        verbose_name_plural = 'Клиенты'
    
    def __str__(self):
        return f'{self.name} ({self.inn})'


class ContactDetail(models.Model):
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        verbose_name='Клиент',
        related_name='contact_details'
    )
    city = models.CharField(
        'Город', max_length=150, blank=True, default=''
    )
    legal_address = models.CharField(
        'Юридический адерс', max_length=250, blank=True, default=''
    )
    shoping_address = models.CharField(
        'Адрес доставки', max_length=250, blank=True, default=''
    )
    payment_type = models.CharField(
        'Вариант оплаты',
        max_length=10,
        default='cash',
        db_index=True,
        choices=(
            ('cash'   , 'наличная'),
            ('cashless', 'безналичная')
    ))

    class Meta:
        verbose_name = 'Контактная информация'
        verbose_name_plural = 'Контактная информация'
    
    def __str__(self):
        return f'{str(self.client)} {self.legal_address}' 

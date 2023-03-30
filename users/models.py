from django.db import models
from django.contrib.auth.models import AbstractUser
from phonenumber_field.modelfields import PhoneNumberField

from clients.models import PriorityDirection


class CustomUser(AbstractUser):
   
    email = models.EmailField('email', db_index=True)
    phone = PhoneNumberField('Контактный телефон', blank=True, db_index=True)
    gender = models.CharField(
        'Пол', max_length=10, default='male', choices=(
            ('male'  , 'Мужской'),
            ('female', 'Женский')
    ))
    date_of_birth = models.DateField(
        'Дата рождения', blank=True, null=True
    )
    priority_direction = models.ManyToManyField(
        PriorityDirection,
        blank=True,
        verbose_name='Приоритетное направление',
        related_name='users'
    )
    created_at = models.DateTimeField(
        'Дата создания', db_index=True, auto_now_add=True
    )

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return self.username

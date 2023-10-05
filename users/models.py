from django.db import models
from django.contrib.auth.models import AbstractUser
from phonenumber_field.modelfields import PhoneNumberField


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
    created_at = models.DateTimeField(
        'Дата создания', db_index=True, auto_now_add=True
    )

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return self.username

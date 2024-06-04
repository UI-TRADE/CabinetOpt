from django.db import models
from django.contrib.auth.models import AbstractUser
from phonenumber_field.modelfields import PhoneNumberField


class CustomUser(AbstractUser):
   
    name = models.CharField('Фамилия Имя Отчество', max_length=150, blank=True)
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
        verbose_name = 'Менеджер ЮИ-Трейд'
        verbose_name_plural = 'Менеджеры ЮИ-Трейд'

    def __str__(self):
        if self.name:
            return self.name
        return self.username

from django.db import models
from django.conf import settings

from clients.models import Organization


class Guarantee(models.Model):
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        primary_key = True,
        verbose_name='Организация',
        related_name='organizations_by_guarantee'
    )
    guarantee = models.TextField('Условия гарантии и возврата', blank=True)


    class Meta:
        verbose_name = 'Гарантия и возврат'
        verbose_name_plural = 'Гарантии и возвраты'
    
    def __str__(self):
        return f'Условия гарантии и возвратов для {self.organization}'
    

class Policy(models.Model):
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        primary_key = True,
        verbose_name='Организация',
        related_name='organizations_by_policy'
    )
    policy = models.TextField('Политика обработки персональных данных', blank=True)


    class Meta:
        verbose_name = 'Политика обработки персональных данных'
        verbose_name_plural = 'Политика обработки персональных данных'
    
    def __str__(self):
        return f'Политика обработки персональных данных для {self.organization}'
    

class Delivery(models.Model):
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        primary_key = True,
        verbose_name='Организация',
        related_name='organizations_by_delivery'
    )
    delivery = models.TextField('Доставка', blank=True)


    class Meta:
        verbose_name = 'Условия доставки'
        verbose_name_plural = 'Условия доставки'
    
    def __str__(self):
        return f'Условия доставки {self.organization}'


class About(models.Model):
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        primary_key = True,
        verbose_name='Организация',
        related_name='organizations_by_about'
    )
    about = models.TextField('О заводах TALANT', blank=True)


    class Meta:
        verbose_name = 'О заводах TALANT'
        verbose_name_plural = 'О заводах TALANT'
    
    def __str__(self):
        return f'О заводах {self.organization}'
    

class Notification(models.Model):
    CONFIM_REG = 'confirm_registration'
    CONFIM_ORDER = 'confirm_order'

    email = models.EmailField('email', db_index=True)
    use_up = models.BooleanField('использовать', default=True, db_index=True)
    notification_type = models.CharField(
        'тип уведомления',
        max_length=50,
        blank=True,
        db_index=True,
        choices=(
            (CONFIM_REG, 'Подтверждение регистрации на сайте'),
            (CONFIM_ORDER  , 'Подтверждение заказа клиента')
    ))

    class Meta:
        verbose_name = 'Настройка уведомления'
        verbose_name_plural = 'Найстройка уведомлений'
    
    def __str__(self):
        return self.email

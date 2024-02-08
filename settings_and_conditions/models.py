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

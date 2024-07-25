from django.db import models

from clients.models import Client, Manager


class Basket(models.Model):
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        verbose_name='Клиент',
        related_name='cart_clients'
    )
    manager = models.ForeignKey(
        Manager,
        on_delete=models.CASCADE,
        verbose_name='Менеджер',
        related_name='cart_managers'
    )
    uuid = models.CharField('Идентификатор записи', max_length=50)
    key = models.JSONField(verbose_name='Ключ', null=True, blank=True, default=dict)
    attributes = models.JSONField(verbose_name='Атрибуты', null=True, blank=True, default=dict)

    class Meta:
        verbose_name = 'Корзина'
        verbose_name_plural = 'Корзина'

    def __str__(self):
        return f'{self.client} ({self.manager})'

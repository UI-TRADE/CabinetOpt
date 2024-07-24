from django.db import models

from clients.models import Client, Manager


class CartQuerySet(models.QuerySet):
    
    def clear_cart_items(self, client, manager, **kwargs):
        if not (client or manager):
            return
        qs = self.filter(client=client) & self.filter(manager=manager)
        if kwargs.get('product_id'):
            qs = qs.filter(key__product_id=kwargs.get('product_id'))
        if kwargs.get('size'):
            qs = qs.filter(key__size=kwargs.get('size')) 
        qs.delete()

    def update_cart_items(self, client, manager, keys, cart):
        if not (client or manager):
            return
        self.clear_cart_items(client, manager)
        cart_items = []
        for key, value in keys.items():
            cart_items.append(
                Cart(
                    client=client, manager=manager,
                    uuid=key, key=value,
                    attributes=cart[key]
            ))
        self.bulk_create(cart_items)

    def get_cart_items(self, client, manager):
        keys, items = {}, {}
        if client and manager:
            qs = self.filter(client=client) & self.filter(manager=manager)
            for item in qs:
                keys[item.uuid] = item.key
                items[item.uuid] = item.attributes

        return keys, items


class Cart(models.Model):
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

    objects = CartQuerySet.as_manager()

    class Meta:
        verbose_name = 'Корзина'
        verbose_name_plural = 'Корзина'

    def __str__(self):
        return f'{self.client} ({self.manager})'

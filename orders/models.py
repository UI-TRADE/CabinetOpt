from django.db import models
from django.core.validators import MinValueValidator

from clients.models import Client, Manager
from catalog.models import Product, PriceType, ProductCost

class Order(models.Model):
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        verbose_name='Клиент',
        related_name='oders_by_client',
        db_index=True,
    )
    manager = models.ForeignKey(
        Manager,
        null=True,
        on_delete=models.SET_NULL,
        verbose_name='Ответственный менеджер',
        related_name='oders_by_manager',
        db_index=True,
    )
    status = models.CharField(
        'Статус',
        max_length=20,
        default='introductory',
        db_index=True,
        choices=(
            ('introductory', 'Предварительный'),
            ('confirmed'   , 'Подтвержден'),
            ('paid'        , 'Оплачен'),
            ('shipment'    , 'Отгрузка'),
            ('completed'   , 'Завершен'),
    ))
    created_at = models.DateTimeField(
        'Дата создания', db_index=True, auto_now_add=True
    )

    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказы'

    def __str__(self):
        return f'Заказ № {self.id} от {self.created_at}'
    
    def get_total_cost(self):
        return sum(item.sum for item in self.items.all())
    
    def get_total_weight(self):
        return round(sum(item.weight for item in self.items.all()),3)
    
    def get_total_quantity(self):
        return sum(item.quantity for item in self.items.all())
    
    def get_total_service(self):
        return sum(
            item.sum for item in self.items.all() \
                if item.product.product_type=='service'
        )
    
    def get_total_max_cost(self):
        return sum(item.max_price for item in self.items.all())


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        db_index=True,
        verbose_name='Заказ',
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        db_index=True,
        verbose_name='Номенклатура',
        related_name='order_items'
    )
    unit = models.CharField(
        'Единица измерения',
        max_length=20,
        default='грамм',
        db_index=True,
        choices=(
            ('796', 'штук'),
            ('163', 'грамм')
    ))
    series = models.CharField('Серия', max_length=50, blank=True)
    uin = models.CharField('УИН', max_length=50, blank=True)
    weight = models.FloatField(
        'Вес', default=0, validators=[MinValueValidator(0)]
    )
    size = models.IntegerField(
        'Размер', default=0, validators=[MinValueValidator(0)]
    )
    quantity = models.PositiveIntegerField('Количество', default=1)
    price = models.DecimalField(
        'Цена',
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    sum = models.DecimalField(
        'Сумма',
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    discount = models.DecimalField(
        'Скидка',
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )
    price_type = models.ForeignKey(
        PriceType,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Тип цены',
        related_name='order_items_by_price',
        db_index=True,
    )

    def __str__(self):
        return f'{self.id}'

    def get_cost(self):
        return self.price * self.quantity
    
    @property
    def max_price(self):
        max_prices = ProductCost.objects.filter(product=self.product)
        if self.weight > 0:
            max_prices = max_prices.filter(weight=self.weight)
        if self.size > 0:
            max_prices = max_prices.filter(size=self.size)
        if max_prices.exists():
            max_price = max_prices.first()
            return max_price.cost * self.quantity
        return self.price * self.quantity

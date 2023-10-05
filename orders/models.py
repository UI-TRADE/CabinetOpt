from django.db import models
from django.core.validators import MinValueValidator

from clients.models import Client, Manager
from catalog.models import Product, PriceType, Price, Size

class Order(models.Model):
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        verbose_name='Клиент',
        related_name='client_oders',
        db_index=True,
    )
    manager = models.ForeignKey(
        Manager,
        null=True,
        on_delete=models.SET_NULL,
        verbose_name='Ответственный менеджер',
        related_name='manager_oders',
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
    provision = models.CharField(
        'Обеспечение',
        max_length=1,
        default='П',
        db_index=True,
        choices=(
            ('П', 'Поставка'),
            ('З', 'Заказ'),
    ))
    created_at = models.DateTimeField(
        'Дата создания', db_index=True, auto_now_add=True
    )
    num_in_1C = models.CharField(
        'номер в ЮТД', max_length=50, blank=True, db_index=True
    )
    identifier_1C = models.CharField(
        'Идентификатор 1С', max_length=50, blank=True, db_index=True
    )

    class Meta:
        # ordering = ('-created_at',)
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказы'

    def __str__(self):
        return f'Заказ № {self.id}/{self.provision} от {self.created_at.strftime("%d-%b-%Y %H:%M:%S")}'
    
    def get_total_cost(self):
        return sum(item.sum for item in self.items.all())
    
    def get_total_weight(self):
        return round(sum(item.weight for item in self.items.all()),3)
    
    def get_total_quantity(self):
        return sum(item.quantity for item in self.items.all())
    
    def get_total_service(self):
        return sum(
            item.sum for item in self.items.all() \
                if item.product and item.product.product_type=='service'
        )
    
    def get_total_max_cost(self):
        return sum(item.max_price for item in self.items.all())
    
    def natural_key(self):
        return (self.id, self.created_at, )


class OrderItem(models.Model):
    # id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        db_index=True,
        verbose_name='Заказ',
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_index=True,
        verbose_name='Номенклатура',
        related_name='product_orders'
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
    size = models.ForeignKey(
        Size,
        null=True,
        on_delete=models.SET_NULL,
        verbose_name='Размер',
        related_name='size_orders'
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
        default=0,
        validators=[MinValueValidator(0)]
    )
    price_type = models.ForeignKey(
        PriceType,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Тип цены',
        related_name='price_type_orders',
        db_index=True,
    )

    def __str__(self):
        return f'{self.id}'

    def get_cost(self):
        return self.price * self.quantity
    
    def get_cost_without_discount(self):
        return (self.price * self.quantity) - self.discount
    
    @property
    def max_price(self):
        if not self.product:
            return 0
        max_prices = Price.objects.available_prices(
            [self.product.id,], PriceType.objects.get(name='Базовая')
        )
        if max_prices.exists():
            max_price = max_prices.first()
            if self.product.unit == '163':
                return round(float(max_price.price) * self.weight, 2)    
            return max_price.price * self.quantity
        if self.product.unit == '163':
            return round(float(self.price) * self.weight, 2)
        return self.price * self.quantity

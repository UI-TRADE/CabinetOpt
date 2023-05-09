from contextlib import suppress
from django.db import models
from django.core.validators import MinValueValidator
from django.db.models import Q, Max
from django.utils import timezone

from clients.models import PriorityDirection, Client, Manager


class Collection(models.Model):
    name = models.CharField('Наименование', max_length=100, db_index=True)
    discount = models.DecimalField(
        'Скидка',
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    identifier_1C = models.CharField(
        'Идентификатор 1С', max_length=50, blank=True, db_index=True
    )

    class Meta:
        verbose_name = 'Коллекция'
        verbose_name_plural = 'Коллекции'

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField('Наименование', max_length=200, db_index=True)
    articul = models.CharField('Артикул', max_length=200, blank=True)
    collection = models.ForeignKey(
        Collection,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Коллекция',
        related_name='goods',
        db_index=True,
    )
    brand = models.ForeignKey(
        PriorityDirection,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Бренд',
        related_name='goods_by_brands'        
    )
    unit = models.CharField(
        'Единица измерения',
        max_length=20,
        default='грамм',
        db_index=True,
        choices=(
            ('796', 'штук'),
            ('163', 'грамм'),
    ))
    price_per_gr = models.DecimalField(
        'Цена за грамм',
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    weight = models.FloatField(
        'Вес', default=0, validators=[MinValueValidator(0)]
    )
    size = models.IntegerField(
        'Размер', default=0, validators=[MinValueValidator(0)]
    )
    stock = models.PositiveIntegerField(
        'Остаток', default=0, validators=[MinValueValidator(0)]
    )
    available_for_order = models.BooleanField(
        'Доступен для заказа', default=False, db_index=True
    )
    created_at = models.DateTimeField(
        'Дата создания', db_index=True, auto_now_add=True
    )
    product_type = models.CharField(
        'Тип номенклатуры',
        max_length=20,
        default='product',
        db_index=True,
        choices=(
            ('product', 'товар'),
            ('service', 'услуга'),
            ('gift_сertificate', 'подарочный сертификат')
    ))
    identifier_1C = models.CharField(
        'Идентификатор 1С', max_length=50, blank=True, db_index=True
    )

    class Meta:
        verbose_name = 'Номенклатура'
        verbose_name_plural = 'Номенкулатура'

    def __str__(self):
        return f'{self.articul} {self.name}'.strip()
    
    @property
    def get_images(self):
        product_images = ProductImage.objects.filter(product_id=self.id)
        return [product_image.image.url for product_image in product_images]


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        null=True,
        on_delete=models.CASCADE,
        verbose_name='Фото',
        related_name='product_images'
    )
    filename = models.CharField(
        'Имя файла', max_length=100, blank=True, db_index=True
    )
    image = models.ImageField('Фото номенклатуры', upload_to='product_images')

    class Meta:
        verbose_name = 'Фотография'
        verbose_name_plural = 'Фотографии'


class PriceType(models.Model):
    name = models.CharField('Наименование', max_length=100, db_index=True)

    class Meta:
        verbose_name = 'Тип цены'
        verbose_name_plural = 'Типы цен'

    def __str__(self):
        return self.name


class PriceQuerySet(models.QuerySet):
    
    def available_prices(self, products_ids, price_type = None):
        with suppress(PriceType.DoesNotExist):
            if not price_type:
                price_type = PriceType.objects.get(name='Розничная')   
            return self.distinct().filter(
                type=price_type,
                product_id__in=products_ids,
                start_at__lte=timezone.now()
            ).filter(
                Q(end_at__isnull=True) | Q(end_at__gte=timezone.now())
            ).values('product_id', 'unit').annotate(actual_price=Max('price'))


class Price(models.Model):
    type = models.ForeignKey(
        PriceType,
        on_delete=models.CASCADE,
        verbose_name='Тип цены',
        related_name='prices_by_type',
        db_index=True,
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        verbose_name='Номенклатура',
        related_name='prices',
        db_index=True,
    )
    unit = models.CharField(
        'Единица измерения',
        max_length=20,
        default='грамм',
        db_index=True,
        choices=(
            ('796', 'штук'),
            ('163', 'грамм'),
    ))
    price = models.DecimalField(
        'Цена',
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    start_at = models.DateTimeField(
        'Дата начала действия', db_index=True, auto_now_add=True
    )
    end_at = models.DateTimeField(
        'Дата окончания действия', db_index=True, blank=True,null=True
    )

    objects = PriceQuerySet.as_manager()

    class Meta:
        verbose_name = 'Цена'
        verbose_name_plural = 'Цены'

    def __str__(self):
        return f'{self.product} {self.price} руб. ({self.type})'


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
        return sum(item.weight for item in self.items.all())
    
    def get_total_quantity(self):
        return sum(item.quantity for item in self.items.all())
    
    def get_total_service(self):
        return sum(
            item.sum for item in self.items.all() \
                if item.product.product_type=='service'
        )


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
            ('штук', 'штук'),
            ('грамм', 'грамм'),
    ))
    series = models.CharField('Серия', max_length=50, blank=True)
    uin = models.CharField('УИН', max_length=50, blank=True)
    weight = models.FloatField(
        'Вес', default=0, validators=[MinValueValidator(0)]
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

from django.db import models
from contextlib import suppress
from django.core.validators import MinValueValidator
from django.db.models import Q, Max
from django.utils import timezone

from clients.models import PriorityDirection, Client


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
    metal = models.CharField('Металл', max_length=50, blank=True, db_index=True)
    metal_content = models.CharField('Проба', max_length=30, blank=True, db_index=True)
    gender = models.CharField(
        'Гендер',
        max_length=10,
        default='-',
        db_index=True,
        choices=(
            ('М', 'мужской'),
            ('Ж', 'женский'),
            ('-', 'мужской, женский'),
    ))
    status = models.CharField(
        'Статус',
        max_length=20,
        blank=True,
        db_index=True,
        choices=(
            ('novelty', 'Новинка'),
            ('order'  , 'Заказ'),
            ('hit'    , 'Хит'),
            ('sale'   , 'Распродажа'),
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


class ProductCost(models.Model):
    product = models.ForeignKey(
        Product,
        null=True,
        on_delete=models.CASCADE,
        verbose_name='Номенклатура',
        related_name='product_cost'
    )
    weight = models.FloatField(
        'Вес', default=0, validators=[MinValueValidator(0)]
    )
    size = models.IntegerField(
        'Размер', default=0, validators=[MinValueValidator(0)]
    )
    cost = models.DecimalField(
        'Стоимость',
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )

    class Meta:
        verbose_name = 'Стоимость изделия'
        verbose_name_plural = 'Стоимость изделий'


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
    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Клиент',
        related_name='prices_by_client',
        db_index=True
    )
    class Meta:
        verbose_name = 'Тип цены'
        verbose_name_plural = 'Типы цен'

    def __str__(self):
        return self.name


class PriceQuerySet(models.QuerySet):
    
    def available_prices(self, products_ids, price_type = None):
        with suppress(PriceType.DoesNotExist):
            if not price_type:
                price_type = PriceType.objects.get(name='Базовая')   
            return self.distinct().filter(
                type=price_type,
                product_id__in=products_ids,
                start_at__lte=timezone.now()
            ).filter(
                Q(end_at__isnull=True) | Q(end_at__gte=timezone.now())
            ).annotate(actual_price=Max('price', 'discount'))


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
    discount = models.DecimalField(
        'Скидка',
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


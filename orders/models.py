from django.db import models
from django.core.validators import MinValueValidator

from clients.models import PriorityDirection
from django.conf import settings

class Collection(models.Model):
    name = models.CharField('Наименование', max_length=100, db_index=True)
    discount = models.DecimalField(
        'Скидка',
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
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
    image = models.ImageField('Фото номенклатуры', upload_to='product_images')

    class Meta:
        verbose_name = 'Фотография'
        verbose_name_plural = 'Фотографии'


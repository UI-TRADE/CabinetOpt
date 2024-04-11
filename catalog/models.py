from django.db import models
from contextlib import suppress
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db.models import F, Q, Max
from django.utils import timezone

from clients.models import Client


class TrimCharField(models.CharField):
    def __init__(self, *args, **kwargs):
        # Добавляем свои дополнительные параметры, в данном случае
        # strip для автоматического удаления пробелов
        self.strip = kwargs.pop('strip', False)

        # Вызываем конструктор родительского класса
        super().__init__(*args, **kwargs)

    def pre_save(self, model_instance, add):
        # Логика обработки поля перед сохранением
        if self.strip and hasattr(model_instance, self.attname):
            value = getattr(model_instance, self.attname)

            if isinstance(value, str):
                # Удаляем пробелы, если параметр strip установлен в True
                setattr(model_instance, self.attname, value.strip())

        # Вызываем метод pre_save родительского класса
        return super().pre_save(model_instance, add)


class CollectionGroup(models.Model):
    name = models.CharField('Наименование', max_length=100, db_index=True)
    order = models.PositiveIntegerField(
        'Порядок', default=1, validators=[MinValueValidator(0)]
    )
    class Meta:
        verbose_name = 'Коллекция'
        verbose_name_plural = 'Коллекции'

    def __str__(self):
        return self.name


class Collection(models.Model):
    group = models.ForeignKey(
        CollectionGroup,
        on_delete=models.PROTECT,
        verbose_name='Группа',
        related_name='collections',
        db_index=True,
    )
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
        verbose_name = 'Вид коллекции'
        verbose_name_plural = 'Виды коллекций'

    def __str__(self):
        return self.name


class Brand(models.Model):
    name = models.CharField('Наименование', max_length=50)
    identifier_1C = models.CharField(
        'Идентификатор 1С', max_length=50, blank=True, db_index=True
    )
    class Meta:
        verbose_name = 'Бренд'
        verbose_name_plural = 'Бренды'

    def __str__(self):
        return self.name


class Gender(models.Model):
    name = models.CharField('Гендер', max_length=100, db_index=True)

    class Meta:
        verbose_name = 'Гендер'
        verbose_name_plural = 'Гендер'

    def __str__(self):
        return self.name


class MetalFinish(models.Model):
    name = models.CharField('Обработка металла', max_length=100, db_index=True)

    class Meta:
        verbose_name = 'Вид обработки металла'
        verbose_name_plural = 'Виды обработки металла'

    def __str__(self):
        return self.name


class Gift(models.Model):
    name = models.CharField('Подарок', max_length=100, db_index=True)

    class Meta:
        verbose_name = 'Подарок'
        verbose_name_plural = 'Подарки'

    def __str__(self):
        return self.name


class Style(models.Model):
    name = models.CharField('Стиль', max_length=100, db_index=True)

    class Meta:
        verbose_name = 'Стиль'
        verbose_name_plural = 'Стили'

    def __str__(self):
        return self.name


class Design(models.Model):
    name = models.CharField('Дизайн', max_length=100, db_index=True)

    class Meta:
        verbose_name = 'Дизайн изделия'
        verbose_name_plural = 'Дизайны изделий'

    def __str__(self):
        return self.name


class ProductQuerySet(models.QuerySet):
    
    def apply_filters(self, filters):
        result = self.distinct()
        for key, value in filters.items():
            if key == 'name':
                result = result.filter(name__in=value.split(';'))
            elif key == 'articul':
                result = result.filter(articul__icontains=value)
            elif key == 'unit':
                result = result.filter(unit=value)
            elif key == 'status':
                result = result.filter(status=value)
        return result
    
    def get_active_products(self, in_stock=True):
        result = self.distinct()
        result = result.filter(product_type='product', show_on_site=True)
        result = result.filter(
            id__in=Price.objects.filter(type__name="Базовая", price__gt=0).values_list("product", flat=True)
        )
        result = result.filter(
            id__in=ProductImage.objects.all().values_list("product", flat=True)
        )
        if in_stock:
            result = result.filter(
                pk__in=StockAndCost.objects.filter(
                    stock__gte=1
                ).values_list('product_id', flat=True)
            )
        return result


class Product(models.Model):
    NOVELTY   = 'new'
    HIT       = 'hit'
    SALE      = 'sale'
    PROFIT    = 'profit'
    EXCLUSIVE = 'exclusive'

    STATUS_CHOICES = (
        (NOVELTY   , 'NEW!'),
        (HIT       , 'ХИТ'),
        (SALE      , 'SALE'),
        (PROFIT    , 'ВЫГОДНО'),
        (EXCLUSIVE , 'ЭКСКЛЮЗИВ'),
    )

    name = models.CharField('Наименование', max_length=200, db_index=True)
    articul = models.CharField('Артикул', max_length=200, blank=True)
    collection = models.ForeignKey(
        Collection,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Коллекция',
        related_name='collection_products',
        db_index=True,
    )
    brand = models.ForeignKey(
        Brand,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Бренд',
        related_name='brand_products'        
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
    available_for_order = models.BooleanField(
        'Доступен для заказа', default=False, db_index=True
    )
    show_on_site = models.BooleanField(
        'Показывать на сайте', default=True, db_index=True
    )
    created_at = models.DateTimeField(
        'Дата создания', db_index=True, auto_now_add=True
    )
    product_type = models.CharField(
        'Тип',
        max_length=20,
        default='product',
        db_index=True,
        choices=(
            ('product', 'товар'),
            ('service', 'услуга'),
            ('gift_сertificate', 'подарочный сертификат')
    ))
    metal = TrimCharField('Металл', max_length=50, blank=True, db_index=True, strip=True)
    metal_content = TrimCharField('Проба', max_length=30, blank=True, db_index=True, strip=True)
    metal_finish = models.ManyToManyField(
        MetalFinish,
        verbose_name='Обработка металла',
        related_name='products_by_gender'
    )
    color = TrimCharField('Цвет', max_length=50, blank=True, db_index=True, strip=True)
    gender = models.ManyToManyField(
        Gender,
        verbose_name='Гендер',
        related_name='products_by_gender'
    )
    status = models.CharField(
        'Статус',
        max_length=20,
        blank=True,
        db_index=True,
        choices=STATUS_CHOICES)
    gift = models.ManyToManyField(
        Gift,
        verbose_name='Подарок',
        related_name='products_by_gift'
    )
    style = models.ManyToManyField(
        Style,
        verbose_name='Стиль',
        related_name='products_by_style'
    )
    design = models.ManyToManyField(
        Design,
        verbose_name='Дизайн',
        related_name='products_by_design'
    )
    str_color = TrimCharField('Цвет строкой', max_length=50, blank=True, db_index=True, strip=True)
    lock_type_earings = models.CharField('Тип и размер замка серег', max_length=50, blank=True, db_index=True)
    lock_type_chain = models.CharField('Тип и размер замка цепей', max_length=50, blank=True, db_index=True)
    lock_type_bracelet = models.CharField('Тип и размер замка браслетов', max_length=50, blank=True, db_index=True)
    chain_width = models.IntegerField(
        'Ширина цепи',
        default=0,
        validators=[MinValueValidator(0)]
    )
    bracelet_width = models.IntegerField(
        'Ширина браслета',
        default=0,
        validators=[MinValueValidator(0)]
    )
    q_borders_c_b = models.IntegerField(
        'Количество граней',
        default=0,
        validators=[MinValueValidator(0)]
    )
    chain_weave = models.CharField('Плетение (для цепей)', max_length=50, blank=True, db_index=True)
    bracelet_weave = models.CharField('Плетение (для браслетов)', max_length=50, blank=True, db_index=True)
    mark_description = models.TextField('Маркетинговое описание', blank=True)
    identifier_1C = models.CharField(
        'Идентификатор 1С', max_length=50, blank=True, db_index=True
    )

    objects = ProductQuerySet.as_manager()

    class Meta:
        verbose_name = 'Номенклатура'
        verbose_name_plural = 'Номенклатура'

    def __str__(self):
        return f'{self.articul} {self.name}'.strip()
    
    def natural_key(self):
        return (self.name, self.id, self.identifier_1C, )
    
    @property
    def get_images(self):
        product_images = ProductImage.objects.filter(product_id=self.id)
        return [product_image.image.url for product_image in product_images]
    
    @property
    def get_default_size(self):
        '''Функция возвращает строку, как этап перехода на учет размеров в БД в строковом варианте'''
        size_value = 0
        stocks_and_costs = StockAndCost.objects.\
            filter(product_id=self.id).annotate(size_name=F('size__name')).\
            exclude(size__isnull=True).order_by('size')
        gender = Gender.objects.none()
        with suppress(Gender.DoesNotExist):
            gender = Gender.objects.get(name = "для женщин")
        with suppress(AttributeError):
            if self.collection.group.name.lower() in ['кольцо', 'кольца', 'колечки', 'колец']:
                size_value = 20
                if gender.products_by_gender.filter(pk=self.id):
                    size_value = 17
            if self.collection.group.name.lower() in ['цепь', 'цепи', 'цепочка', 'цепочек']:
                size_value = 50
        
        found_size = Size.objects.get_current_size(size_value)
        if found_size and stocks_and_costs.filter(size=found_size):
            return found_size.name

        product_size = stocks_and_costs.first()
        if product_size:
            return product_size.size_name


class SizeQuerySet(models.QuerySet):

    def get_by_natural_key(self, size_name):
        return self.get(name=size_name)

    def get_current_size(self, size):
        return self.filter(size_from__lte=size, size_to__gte=size).first()


class Size(models.Model):
    name = models.CharField('Размер', max_length=20, db_index=True, blank=True)
    size_from = models.FloatField(
        'Размер от',
        default=0.0,
        validators=[MinValueValidator(0)]
    )
    size_to = models.FloatField(
        'Размер до',
        default=0.0,
        validators=[MinValueValidator(0)]
    )

    objects = SizeQuerySet.as_manager()

    class Meta:
        verbose_name = 'Размер'
        verbose_name_plural = 'Размеры'
        unique_together = ('size_from', 'size_to')

    def __str__(self):
        return f'{self.name}'
    
    def natural_key(self):
        return (self.name, self.id,)


class StockAndCostQuerySet(models.QuerySet):
    
    def get_by_natural_key(self, first_name, last_name):
        return self.get(first_name=first_name, last_name=last_name)

    def available_stocks_and_costs(self, products_ids, **kwargs):
        clients = kwargs.get(
            'clients',
            Client.objects.none()
        )
        products = Product.objects.filter(pk__in = products_ids)
        stocks_and_costs = self.filter(product_id__in = products_ids)
        prices = Price.objects.available_prices(products_ids)
        discount_prices = Price.objects.none()
        with suppress(PriceType.DoesNotExist):
            discount_prices = Price.objects.available_prices(
                products_ids, PriceType.objects.get(name='Выгода')
            )
        with suppress(PriceType.DoesNotExist):
            client_prices = Price.objects.available_prices(
                products_ids, PriceType.objects.get(client = clients.get())
            )
            prices = prices.exclude(
                product_id__in = client_prices.values_list('product_id', flat=True)
            ) | client_prices
    
        collections = products.annotate(
            collection_name=F('collection__name'),
            collection_group=F('collection__group__name')
        ).values('id', 'collection_name', 'collection_group')
        
        if kwargs.get('size', ''):
            stocks_and_costs = stocks_and_costs.filter(
                size_id__in=Size.objects.filter(
                    name=kwargs['size']
                ).values_list('pk', flat=True)
            )

        return collections, products, stocks_and_costs, prices, discount_prices

    def default_stocks_and_costs(self, products_ids, **kwargs):
        result = StockAndCost.objects.none()

        products = Product.objects.filter(pk__in = products_ids)
        for product in products:
            default_size = product.get_default_size
            if kwargs.get('size', ''):
                default_size = kwargs['size']
            if default_size:
                result = result | self.filter(
                    product = product, size_id__in = Size.objects.filter(name=default_size).\
                        values_list('pk', flat=True)
                )

        return result


class StockAndCost(models.Model):
    product = models.ForeignKey(
        Product,
        null=True,
        on_delete=models.CASCADE,
        verbose_name='Номенклатура',
        related_name='stocks_and_costs'
    )
    weight = models.FloatField(
        'Вес', default=0, validators=[MinValueValidator(0)]
    )
    size = models.ForeignKey(
        Size,
        null=True,
        blank = True,
        on_delete=models.SET_NULL,
        verbose_name='Размер',
        related_name='sizes'
    )
    stock = models.PositiveIntegerField(
        'Остаток', default=0, validators=[MinValueValidator(0)]
    )    
    cost = models.DecimalField(
        'Максимальная цена за грамм',
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )

    objects = StockAndCostQuerySet.as_manager()

    class Meta:
        verbose_name = 'Наличие и стоимость изделия'
        verbose_name_plural = 'Наличие и стоимость изделий'


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
        related_name='client_prices',
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
            ).annotate(actual_price=Max('price'))
        return self.all()


class Price(models.Model):
    type = models.ForeignKey(
        PriceType,
        on_delete=models.CASCADE,
        verbose_name='Тип цены',
        related_name='prices',
        db_index=True,
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        verbose_name='Номенклатура',
        related_name='product_prices',
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
        'Дата начала действия', db_index=True, default=timezone.now
    )
    end_at = models.DateTimeField(
        'Дата окончания действия', db_index=True, blank=True,null=True
    )

    objects = PriceQuerySet.as_manager()

    class Meta:
        verbose_name = 'Цена'
        verbose_name_plural = 'Цены'

    def __str__(self):
        return f'{self.product} {self.price} руб ({self.type})'


class PreciousStone(models.Model):
    name = models.CharField('Наименование', max_length=100, db_index=True)
    short_title = models.CharField('Краткое наименование', max_length=10, blank=True)

    class Meta:
        verbose_name = 'Камень'
        verbose_name_plural = 'Камни'

    def __str__(self):
        return self.name
    
    def __repr__(self):
        return self.short_title if self.short_title else self.name


class CutTypeImage(models.Model):
    name = models.CharField('Наименование', max_length=100, db_index=True)
    image = models.ImageField('Изображение', upload_to='cut_type_images', blank=True, null=True)

    class Meta:
        verbose_name = 'Изображение огранки'
        verbose_name_plural = 'Изображения видов огранки'

    def __str__(self):
        return self.name


class CutType(models.Model):
    name = models.CharField('Наименование', max_length=100, db_index=True)
    short_title = models.CharField('Краткое наименование', max_length=100, blank=True, db_index=True)
    cut_type_image = models.ForeignKey(
        CutTypeImage,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='Изображение',
        related_name='cut_type_images'
    )

    class Meta:
        verbose_name = 'Огранка'
        verbose_name_plural = 'Виды огранки'

    def __str__(self):
        return self.name


class GemSet(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        verbose_name='Номенклатура',
        related_name='gem_sets',
        db_index=True
    )
    size = models.ForeignKey(
        Size,
        null=True,
        blank = True,
        on_delete=models.SET_NULL,
        verbose_name='Размер',
        related_name='product_sizes'
    )
    precious_stone = models.ForeignKey(
        PreciousStone,
        on_delete=models.CASCADE,
        verbose_name='Камни',
        related_name='precious_stones',
        db_index=True
    )
    gem_color = models.CharField('Цвет', max_length=50, blank=True, db_index=True)
    gem_weight = models.FloatField(
        'Вес, кр', default=0, validators=[MinValueValidator(0)]
    )
    order = models.PositiveIntegerField(
        'Порядок', default=1, validators=[MinValueValidator(0)]
    )
    description = models.TextField('Описание', blank=True)
    cut_type = models.ForeignKey(
        CutType,
        on_delete=models.SET_NULL,
        verbose_name='Огранка',
        related_name='cut_types',
        null=True,
        blank=True,
        db_index=True
    )
    comment = models.CharField('Комментарий', max_length=250, blank=True)
    gem_quantity = models.PositiveIntegerField(
        'Количество', default=1, validators=[MinValueValidator(0)]
    )
    color_filter = models.CharField('Группа расцветки', max_length=50, blank=True, db_index=True)
    precious_filter = models.CharField('Тип камня', max_length=50, blank=True, db_index=True)

    class Meta:
        verbose_name = 'Вставка'
        verbose_name_plural = 'Вставки'

    def __str__(self):
        return f'{self.gem_quantity} \
            {repr(self.precious_stone)} \
            {self.cut_type if self.cut_type else ""} - \
            {self.gem_weight} ct'


class ProductsSet(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        verbose_name='Номенклатура',
        db_index=True
    )
    accessory = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        verbose_name='Комплектующее',
        related_name='set_of_products',
        db_index=True
    )

    class Meta:
        verbose_name = 'Состав'
        verbose_name_plural = 'Состав'

    def __str__(self):
        return f'{self.accessory}'


class SimilarProducts(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        verbose_name='Номенклатура',
        db_index=True
    )
    similar_product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        verbose_name='Аналог',
        related_name='similar_products',
        db_index=True
    )

    class Meta:
        verbose_name = 'Аналог'
        verbose_name_plural = 'Аналоги'

    def __str__(self):
        return f'{self.similar_product}'
    
    def save(self, *args, **kwargs):
        if self.product == self.similar_product:
            raise ValidationError('Изделие не может быть аналогом самому себе!')
        
        super(SimilarProducts, self).save(*args, **kwargs)


class ColorOfStone(models.Model):
    name = models.CharField('Наименование', max_length=100, db_index=True)
    site = models.CharField('наименование для сайта', max_length=10, blank=True)
    name_of_filter = models.CharField('наименование для фильтра', max_length=10, blank=True)

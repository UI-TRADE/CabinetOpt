from django.db import models
from django.conf import settings

from clients.models import Organization


class SingletonModel(models.Model):
    """Singleton Django Model

    Ensures there's always only one entry in the database, and can fix the
    table (by deleting extra entries) even if added via another mechanism.

    Also has a static load() method which always returns the object - from
    the database if possible, or a new empty (default) instance if the
    database is still empty. If your instance has sane defaults (recommended),
    you can use it immediately without worrying if it was saved to the
    database or not.

    Useful for things like system-wide user-editable settings.
    """

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        """
        Save object to the database. Removes all other entries if there
        are any.
        """
        self.__class__.objects.exclude(id=self.id).delete()
        super(SingletonModel, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        """
        Load object from the database. Failing that, create a new empty
        (default) instance of the object and return it (without saving it
        to the database).
        """

        try:
            return cls.objects.get()
        except cls.DoesNotExist:
            return cls()


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


class CatalogFilter(SingletonModel):
    metals = models.BooleanField('металл', default=True)
    metal_finish = models.BooleanField('обработка металлов', default=False)
    brands = models.BooleanField('бренд', default=False)
    prod_status = models.BooleanField('маркетинговый статус', default=False)
    collections = models.BooleanField('коллекции', default=True)
    genders = models.BooleanField('для кого', default=False)
    sizes = models.BooleanField('размеры', default=True)
    gems = models.BooleanField('вставки', default=True)
    colors = models.BooleanField('цвета вставок', default=True)
    cuts = models.BooleanField('огранка', default=False)

    quantity_range = models.BooleanField('количество вставок', default=False)
    instok_range = models.BooleanField('остатки', default=False)
    price_range = models.BooleanField('базовые цены', default=False)
    weight_range = models.BooleanField('вес изделий', default=False)

    hide_count_of_products = models.BooleanField('скрывать количество изделий в фильтрах', default=True)

    class Meta:
        verbose_name = 'Настройка фильтров каталога'
        verbose_name_plural = 'Настройка фильтров каталога'

    def __str__(self):
        return 'Настройка фильтров каталога'

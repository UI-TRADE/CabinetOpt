from django.db import models
from django.conf import settings

from clients.models import Organization
from mailings.models import NotifyTemplate


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


class NotificationType(models.Model):
    REG_REQUEST   = 'registration_request'
    CONFIM_REG    = 'confirm_registration'
    CANCEL_REG    = 'cancel_registration'
    CONFIM_ORDER  = 'confirm_order'
    GET_ORDER     = 'get_order'
    RECOVERY_PASS = 'recovery_password'
    LOCKED_CLIENT = 'locked_client'
    NEW_MANAGER   = 'add_manager'

    event = models.CharField(
        'Событие',
        max_length=50,
        db_index=True,
        choices=(
            (REG_REQUEST   , 'Получение заявки на регистрацию'),
            (CONFIM_REG    , 'Подтверждение регистрации на сайте'),
            (CANCEL_REG    , 'Отмена регистрации на сайте'),
            (CONFIM_ORDER  , 'Подтверждение заказа клиента'),
            (GET_ORDER     , 'Заказ получен в 1С'),
            (RECOVERY_PASS , 'Запрос восстановления пароля'),
            (LOCKED_CLIENT , 'Временное отключение клиента от входа в ЛК'),
            (NEW_MANAGER   , 'Добавление менеджера клиента'),
    ))
    subject = models.CharField('Тема письма', max_length=100, blank=True)
    template = models.ForeignKey(
        NotifyTemplate,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Шаблон письма',
        related_name='notification_templates'
    )
    notification = models.TextField('Содержание письма', blank=True)

    class Meta:
        verbose_name = 'Тип уведомления'
        verbose_name_plural = 'Типы уведомлений'
    
    def __str__(self):
        return f'{self.subject if self.subject else self.get_event_display()}'


class Notification(models.Model):
    NOTIFICATION_TO_CLIENTS       = 'clients'
    NOTIFICATION_TO_MANAGERS      = 'managers'
    NOTIFICATION_CLIENTS_MANAGERS = 'both'

    email = models.EmailField('email', blank=True, db_index=True)
    use_up = models.BooleanField('использовать', default=True, db_index=True)
    notification_type = models.ForeignKey(
        NotificationType,
        null=True,
        on_delete=models.CASCADE,
        verbose_name='тип уведомления',
        related_name='notifications'
    )
    manager_talant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Менеджер ЮИ-Трейд',
        related_name='notified_managers'
    )
    notify = models.CharField(
        'Уведомлять', max_length=20, default='both', choices=(
            (NOTIFICATION_TO_CLIENTS      , 'Клиентов'),
            (NOTIFICATION_TO_MANAGERS     , 'Мереджеров ЮИ-Трейд'),
            (NOTIFICATION_CLIENTS_MANAGERS, 'Клиентов и мереджеров ЮИ-Трейд'),
    ))

    class Meta:
        verbose_name = 'Настройка уведомления'
        verbose_name_plural = 'Найстройка уведомлений'
    
    def __str__(self):
        return self.email


class BannerQuerySet(models.QuerySet):

    def get_active_banners(self):
        first_banner = self.order_by('-created_at').filter(priority=1).first()
        second_banner = self.order_by('-created_at').filter(priority=2).first()
        return [first_banner, second_banner]


class Banner(models.Model):

    name = models.CharField('Наименование', max_length=200, db_index=True)
    image = models.ImageField('Изображение', upload_to='banner_images')
    link = models.URLField('Ссылка', max_length = 200, null=True, blank=True)
    description = models.TextField('Описание', blank=True)
    priority = models.PositiveSmallIntegerField(
       choices=((1, 'первый'), (2, 'второй'),),
       default=1,
       db_index=True
    )
    created_at = models.DateTimeField(
        'Дата создания', db_index=True, auto_now_add=True
    )

    objects = BannerQuerySet.as_manager()

    class Meta:
        verbose_name = 'Баннер'
        verbose_name_plural = 'Баннеры'
    
    def __str__(self):
        return self.name
    
    @property
    def get_image(self):
        return self.image.url


class CatalogFilter(SingletonModel):
    metals = models.BooleanField('металл', default=True)
    metal_finish = models.BooleanField('обработка металлов', default=False)
    brands = models.BooleanField('бренд', default=False)
    prod_status = models.BooleanField('маркетинговый статус', default=False)
    сategories = models.BooleanField('группы товаров', default=True)
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


class Promo(models.Model):
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        primary_key = True,
        verbose_name='Организация',
        related_name='promotions'
    )
    description = models.TextField('Акция', blank=True)


    class Meta:
        verbose_name = 'Акция'
        verbose_name_plural = 'Акции'
    
    def __str__(self):
        return f'Акции: {self.organization}'

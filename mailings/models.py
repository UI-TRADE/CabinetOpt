from django.db import models
from clients.models import CustomerSegments


class NotifyTemplate(models.Model):
    name = models.CharField('Наименование', max_length=150, unique=True)
    header_template = models.TextField('Заголовок письма', blank=True)
    footer_template = models.TextField('Подвал письма' , blank=True)

    class Meta:
        verbose_name = 'Шаблон письма'
        verbose_name_plural = 'Шаблоны писем'

    def __str__(self):
        return self.name



class MailingOfLetters(models.Model):
    COMPLETED  = 'completed'
    SENT       = 'sent'
    NEW        = 'new'

    STATUS_CHOICES = (
        (COMPLETED, 'Выполнено'),
        (SENT     , 'К отправке'),
        (NEW      , 'Новая'),
    )

    name = models.CharField('Наименование рассылки', max_length=150, unique=True)
    segment = models.ManyToManyField(
        CustomerSegments,
        verbose_name='Сегмент клиентов',
        related_name='mailing_segments'
    )
    subject = models.CharField('Тема рассылки', max_length=100, blank=True)
    template = models.ForeignKey(
        NotifyTemplate,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Шаблон письма',
        related_name='mailing_of_letter_templates'
    )
    content = models.TextField('Содержание письма', blank=True)
    status = models.CharField(
        'Статус рассылки',
        max_length=20,
        db_index=True,
        default=NEW,
        choices=STATUS_CHOICES)
    created_at = models.DateTimeField(
        'Дата создания', db_index=True, auto_now_add=True
    )

    class Meta:
        verbose_name = 'Рассылка'
        verbose_name_plural = 'Рассылки'

    def __str__(self):
        return self.name


class OutgoingMail(models.Model):
    email = models.CharField('Email получателя', max_length=1024, db_index=True)
    subject = models.CharField('Тема', max_length=150, blank=True)
    html_content = models.TextField('Содержание письма')
    sent_date = models.DateTimeField(
        'Дата отправки', db_index=True, blank=True, null=True
    )

    class Meta:
        verbose_name = 'Исходящее письмо'
        verbose_name_plural = 'Исходящие письма'

    def __str__(self):
        return self.email


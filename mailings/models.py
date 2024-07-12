from django.db import models
from clients.models import Client


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
    client = models.ManyToManyField(
        Client,
        verbose_name='Клиенты',
        related_name='mailing_clients'
    )
    subject = models.CharField('Тема рассылки', max_length=100, blank=True)
    template = models.TextField('Шаблон', blank=True)
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
    email = models.CharField('Email получателя', max_length=254, db_index=True)
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


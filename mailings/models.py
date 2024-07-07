from django.db import models


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

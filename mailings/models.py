from django.db import models


class OutgoingMail(models.Model):
    email = models.CharField('Email получателя', max_length=254, db_index=True)
    subject = models.CharField('Тема', max_length=150, blank=True)
    html_content = models.TextField('Содержание письма')
    sent = models.BooleanField('Отправлено', default=False, db_index=True)

    class Meta:
        verbose_name = 'Исходящее письмо'
        verbose_name_plural = 'Исходящие письма'

    def __str__(self):
        return self.email

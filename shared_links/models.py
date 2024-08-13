from django.db import models
from django.utils.crypto import get_random_string

class Link(models.Model):
    key = models.CharField(max_length=12, unique=True)
    path = models.CharField(verbose_name='url', max_length=255)
    param = models.JSONField(verbose_name='Параметры', null=True, blank=True, default=dict)
    created_at = models.DateTimeField(verbose_name='Дата создания', auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = get_random_string(12)
        super().save(*args, **kwargs)

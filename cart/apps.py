from django.apps import AppConfig


class CartConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cart'
    verbose_name = 'Корзина'

    def ready(self):
        self.send_into_talant_from_cart = True

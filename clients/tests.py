from faker import Faker
from django.urls import reverse
from django.test import TestCase
from django.conf import settings

from .models import RegistrationOrder
from utils.requests import set_default_http_protocol


# Create your tests here.
class RegistrationOrderTest(TestCase):

    @classmethod
    def setUpTestData(cls):
        '''setUpTestData: Run once to set up non-modified data for all class methods.'''
        pass

    def setUp(self):
        '''setUp: Run once for every test method to setup data.'''
        self.fake_orders = []
        self.faker = Faker('ru_RU')
        
    def tearDown(self):
        '''tearDown: Run once after test method to clean data.'''
        pass

    def test_registration_order_registered(self):
        for _ in range(3):
            obj = RegistrationOrder(
                name=self.faker.name(),
                organization=self.faker.company(),
                identification_number=self.faker.businesses_inn(),
                name_of_manager=self.faker.name(),
                email=self.faker.email(),
                phone=self.faker.phone_number(),
                status='registered',
            )
            obj.save()

            settings.REDIS_CONN.hmset(
                f'registration_order_{obj.id}',
                {
                    'notification_type': 'confirm_registration',
                    'id': obj.id,
                    'form': 'forms/confirm.html',
                    'url': reverse('clients:change_pass'),
                    'subject': 'доступ к личному кабинету на сайте opt.talantgold.ru',
                    'message': 'доступ к личному кабинету на сайте opt.talantgold.ru'
            })

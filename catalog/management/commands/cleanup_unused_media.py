import os
import sys
import six
from django.conf import settings
from django.core.management import BaseCommand

from catalog.models import ProductImage
from settings_and_conditions.notify_rollbar import notify_rollbar


IMAGES_PATH = 'product_images'


def get_all_media():
    media = set()
    for root, _, files in os.walk(six.text_type(os.path.join(settings.MEDIA_ROOT, IMAGES_PATH))):
        for name in files:
            media.add(os.path.abspath(os.path.join(root, name)))

    return media


def get_unused_media():
    all_media = get_all_media()

    used_media = ProductImage.objects.all().values_list('filename', flat=True)
    unused_media = [path for path in all_media if not os.path.relpath(
        path, os.path.join(settings.MEDIA_ROOT, IMAGES_PATH)
    ) in used_media]
    return unused_media


class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument(
            '--noinput',
            dest='interactive',
            help='Do not ask confirmation'
        )


    def handle(self, *args, **options):
        try:
            with notify_rollbar():
                unused_media = get_unused_media()
                for filename in unused_media:
                    os.remove(filename)

        finally:
            interactive = bool(options.get('interactive'))
            if not interactive:
                sys.exit(1)
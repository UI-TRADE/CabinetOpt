import sys
import schedule
import time

from django.core.management import BaseCommand
from django.utils import timezone

from ...models import Link


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('--timeout', nargs='+', type=int, default=0, help='Run a command on a schedule with a specified timeout in minutes.')

    def handle(self, *args, **options):
        if options['timeout']:
            timeout, = options['timeout']
            while True:
                try:
                    schedule.every(timeout).minutes.do(clear_links)
                    while True:
                        time.sleep(60)
                        schedule.run_pending()
                        if not schedule.jobs:
                            break
                except Exception:
                    continue
        else:
            try:
                clear_links()
            finally:
                sys.exit(1)


def clear_links():
    print('clean expired links:')
    expired_links = Link.objects.filter(expired_at__lte=timezone.now())
    print(expired_links)
    expired_links.delete()

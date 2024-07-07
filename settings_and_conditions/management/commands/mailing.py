import sys
import schedule
import time

from datetime import timedelta
from django.core.management import BaseCommand
from django_rq import get_queue

from mailings.models import OutgoingMail
from mailings.tasks import send_email


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('--timeout', nargs='+', type=int, default=0, help='Run a command on a schedule with a specified timeout in minutes.')

    def handle(self, *args, **options):
        if options['timeout']:
            timeout, = options['timeout']
            while True:
                try:
                    schedule.every(timeout).minutes.do(launch_mailing)
                    while True:
                        time.sleep(60)
                        schedule.run_pending()
                        if not schedule.jobs:
                            break
                except Exception:
                    continue
        else:
            try:
                launch_mailing()
            finally:
                sys.exit(1)


def launch_mailing():
    unsent_mails = OutgoingMail.objects.filter(sent_date__isnull=True)
    for unset_mail in unsent_mails:
        current_queue = get_queue()
        current_queue.enqueue_in(
            timedelta(seconds=1),
            send_email,
            unset_mail.html_content,
            unset_mail.email.split(';'),
            subject=unset_mail.subject,
            obj_id=unset_mail.id
        )

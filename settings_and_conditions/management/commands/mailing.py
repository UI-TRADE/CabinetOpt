import json
import sys
import schedule
import time

from contextlib import suppress
from django.conf import settings
from django.core.management import BaseCommand

from mailings.tasks import get_mail_params, send_email_hide_recipients


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

    def get_value(conn, key, field):
        if field == 'params':
            result = {}
            with suppress(json.decoder.JSONDecodeError):
                result = json.loads(conn.hmget(key, field)[0].decode()) 
        else:
            result = conn.hmget(key, field)[0].decode()
        return result

    fields = {'notification_type': '', 'id': '', 'url': '', 'params': ''}
    redis_storage = settings.REDIS_CONN
    tasks = redis_storage.keys()
    for key in tasks:
        for field in fields.keys():
            fields[field] = get_value(redis_storage, key, field)
        mail_params = get_mail_params(fields)
        if mail_params:
            send_email_hide_recipients(
                mail_params['context'],
                mail_params['recipient_list'],
                subject=mail_params['subject'],
                template=mail_params['template']
            )

        redis_storage.delete(key)

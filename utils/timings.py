import os.path
import datetime
import functools

from datetime import datetime
from contextlib import suppress
from django.conf import settings


class TimeNotify(Exception):
    run_time = None

    def __init__(self, *args: object) -> None:
        self.run_time = datetime.now()
        self.module_name, self.class_name, self.procedure_name, self.time_info, = args
        self.write()
        super().__init__(*args)

    def __str__(self):
        if self.class_name:
            return f'[{self.run_time}] время выполнения {self.module_name}.{self.class_name}.{self.procedure_name} - {self.time_info} s.'

        return f'[{self.run_time}] время выполнения {self.module_name}.{self.procedure_name} - {self.time_info} s.'
    
    def write(self):
        with open(os.path.join(settings.BASE_DIR, 'time.log'), 'a+') as log_handler:
            log_handler.write(f'{str(self)}\n')


def measure_time(class_name=''):
    def wrap(func):
        @functools.wraps(func)
        def run_func(*args):
            start_time = datetime.now()
            result = func(*args)
            time_diff = datetime.now() - start_time
            with suppress(TimeNotify):
                raise TimeNotify(func.__module__, class_name, func.__name__, time_diff.total_seconds())

            return result

        return run_func
    return wrap
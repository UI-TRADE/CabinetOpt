import functools
import requests

from redis.exceptions import ConnectionError as RedisConnectionError

SLUG_TO_EXCEPTIONS_TITLE = {
    'redis_connection_error': 'redis connection error',
}

def get_slug_of_failure(exe):

    if isinstance(exe, (
        ConnectionError,
        requests.exceptions.HTTPError
    )):
        return 'connection_error'
    elif isinstance(exe, RedisConnectionError):
        return 'redis_connection_error'
    elif isinstance(exe, KeyError):
        return 'unsupported_command_error'
    elif isinstance(exe, (ValueError, TypeError, NameError, IndexError)):
        return 'unsupported_query_error'

    if hasattr(exe, 'slug'):
        return exe.slug

    return 'unknown_error'


def handle_errors():
    def wrap(func):
        @functools.wraps(func)
        def run_func(*args):
            try:
                return func(*args)
            except Exception as exe:

                title_of_error = SLUG_TO_EXCEPTIONS_TITLE.get(
                    get_slug_of_failure(exe), ''
                )
                # if title_of_error:
                #     logger.exception(title_of_error)
                # else:
                #     logger.exception(exe)        
                pass

            finally:
                pass

        return run_func
    return wrap
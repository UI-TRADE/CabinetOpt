import json
import hashlib
from functools import wraps
from django.core.cache import cache


def generate_cache_key(key):
    if not isinstance(key, str):
        key_str = json.dumps(key, sort_keys=True)
    else:
        key_str = key   
    return hashlib.md5(key_str.encode('utf-8')).hexdigest() 


def use_cache(cache_pref, cache_key, cache_time):
    def wrap(func):
        @wraps(func)
        def run_func(*args, **kwargs):
            with use_cache(cache_pref, cache_key, cache_time) as cache_handler:
                if cache_handler.cache is None:
                    cache_handler.cache = func(*args, **kwargs)
            return cache_handler.cache
        return run_func
    return wrap


class use_cache:
    def __init__(self, cache_pref, cache_key, cache_time):
        self.cache, self.save = None, False; self.cache_time = cache_time
        self.cache_key_hash = f'{cache_pref}:{generate_cache_key(cache_key)}'

    def __enter__(self):
        self.cache = cache.get(self.cache_key_hash)
        self.save = self.cache is None
        return self
    
    def __exit__(self, *args):
        if self.cache and self.save:
            cache.set(self.cache_key_hash, self.cache, self.cache_time)

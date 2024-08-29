import asyncio
import logging
import html
import traceback

from aiogram import Bot, Dispatcher
from django.conf import settings
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class TelegramFilter(logging.Filter):
    def filter(self, record):
        if record.levelno == logging.DEBUG:
            return settings.DEBUG
        return record.levelno in (logging.INFO, logging.ERROR, logging.CRITICAL)


class AiogramTelegramHandler(logging.Handler):
    def __init__(self, token, chat_id):
        super().__init__()
        self.bot = Bot(token=token)
        self.chat_id = chat_id

    def emit(self, record):
        log_entry = self.format(record)
        # asyncio.run(self.send_log(log_entry))
        try:
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        loop.run_until_complete(self.send_log(log_entry))

    async def send_log(self, log_entry):
        await self.bot.send_message(chat_id=self.chat_id, text=log_entry, parse_mode="HTML")



class TelegramLogFormatter(logging.Formatter):
    def format(self, record):
        log_time = self.formatTime(record, datefmt="%Y-%m-%d %H:%M:%S")
        level_name = record.levelname
        log_message = record.getMessage()
        log_location = f"{record.pathname}:{record.lineno}"
        log_environment = settings.LOG_ENV

        if record.exc_info:
            exc_type, exc_value, exc_tb = record.exc_info
            traceback_info = ''.join(traceback.format_exception(exc_type, exc_value, exc_tb))
        else:
            traceback_info = log_location

        formatted_message = (
            f'<b>{log_time}</b>\n'
            f'❗{level_name}\n'
            f'<i>{log_environment}</i>\n'
            f'<code>{html.escape(log_message)}</code>\n'
            f'<i>({html.escape(traceback_info)})</i>\n'
        )
        
        return formatted_message


@contextmanager
def notify_logging(level='error', extra_data=None):

    try:
        yield
    except Exception as error:
        log_message = f'{error}'
        if extra_data:
            log_message = f'{error}: {extra_data}'    
        if level == 'error':
            logger.error(log_message)
        elif level == 'info':
            logger.info(log_message)
        elif level == 'warning':
            logger.warning(log_message)
        elif level == 'debug':
            logger.debug(log_message)
        elif level == 'critical':
            logger.critical(log_message)
        raise
    finally:
        pass
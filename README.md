# Личный кабинет для опта на сайте talantgold.ru

Основной функционал: 
    1.  Регистрация и авторизация
    2.	Личный кабинет и карточка ЮЛ в админке
    3.	Корзина
    4.	Страничка ПАРТНЁРАМ
    5.	Ассортимент и цена


# Запуск сайта

Скачайте код:
```sh
git clone https://github.com/JuliaKendo/CabinetOpt.git
```

[Установите Python](https://www.python.org/), если этого ещё не сделали.

Проверьте, что `python` установлен и корректно настроен. Запустите его в командной строке:
```sh
python --version
```
**Важно!** Версия Python должна быть не ниже 3.9.

Возможно, вместо команды `python` здесь и в остальных инструкциях этого README придётся использовать `python3`. Зависит это от операционной системы и от того, установлен ли у вас Python другой версии.

В каталоге проекта создайте виртуальное окружение:
```sh
python -m venv venv
```
Активируйте его. На разных операционных системах это делается разными командами:
- Windows: `.\venv\Scripts\activate`
- MacOS/Linux: `source venv/bin/activate`

Перейдите в каталог проекта:

```sh
cd CabinetOpt
```

## Как развернуть dev-версию сайта

Для запуска сайта нужно запустить **одновременно** бэкенд и фронтенд, в двух терминалах.

### Как собрать бэкенд

Установите переменные окружения:

`SECRET_KEY` - уникальный ключ проекта.

`DEBUG` - установите 1 для разработки.

`ALLOWED_HOSTS` - см [Django docs](https://docs.djangoproject.com/en/3.1/ref/settings/#allowed-hosts).

`CSRF_TRUSTED_ORIGINS` - устанавливает определенные адреса в качестве доверенных для запуска админ панели сайта (пр. "http://127.0.0.1:8000,")


Установите зависимости в виртуальное окружение:
```sh
pip install -r requirements.txt
```

Создайте файл базы данных SQLite и отмигрируйте её следующей командой:

```sh
python manage.py migrate
```

Запустите сервер:

```sh
python manage.py runserver
```


### Собрать фронтенд

## Как развернуть stage-версию сайта

Установите Docker и docker compose следуя инструкциям в [документации Docker](https://docs.docker.com/engine/install/)

Установите переменные окружения:

`SECRET_KEY` - уникальный ключ проекта.

`DEBUG` - установите 1 для разработки.

`ALLOWED_HOSTS` - см [Django docs](https://docs.djangoproject.com/en/3.1/ref/settings/#allowed-hosts).

`CSRF_TRUSTED_ORIGINS` - устанавливает определенные адреса в качестве доверенных для запуска админ панели сайта (пр. "http://127.0.0.1:8000,")

`DATABASE` - имя, используемое в sh скрипте для определения типа базы данных (пр. postgres)

`DB_ENGINE` - имя, указывает на используемый движок для доступа к БД. (пр. "django.db.backends.postgresql")

`DB_NAME` - имя базы данных

`DB_USER` - имя пользователя для доступа к базе данных

`DB_PASSWORD` - пароль пользователя для доступа к базе данных

`DB_HOST` - имя или ip адрес хоста на котором располагается база данных (в случае развертывания в docker тут пишем имя соответствующего сервиса из docker-compose)

`DB_PORT` - порт на котором развернута база данных на хосте

`DB_EMAIL` - адрес электронной почты пользователя, будет использоваться для автоматического создания супер-пользователя django


Запустите развертывание сайта в Docker:

```sh
docker-compose up -d --build
```

## Как развернуть prod-версию сайта

Установите Docker и docker compose следуя инструкциям в [документации Docker](https://docs.docker.com/engine/install/)

Установите переменные окружения:

`SECRET_KEY` - уникальный ключ проекта.

`DEBUG` - установите 0.

`ALLOWED_HOSTS` - см [Django docs](https://docs.djangoproject.com/en/3.1/ref/settings/#allowed-hosts).

`CSRF_TRUSTED_ORIGINS` - устанавливает определенные адреса в качестве доверенных для запуска админ панели сайта (пр. "http://127.0.0.1:8000,")

`DATABASE` - имя, используемое в sh скрипте для определения типа базы данных (пр. postgres)

`DB_ENGINE` - имя, указывает на используемый движок для доступа к БД. (пр. "django.db.backends.postgresql")

`DB_NAME` - имя базы данных

`DB_USER` - имя пользователя для доступа к базе данных

`DB_PASSWORD` - пароль пользователя для доступа к базе данных

`DB_HOST` - имя или ip адрес хоста на котором располагается база данных (в случае развертывания в docker тут пишем имя соответствующего сервиса из docker-compose)

`DB_PORT` - порт на котором развернута база данных на хосте

Запустите развертывание сайта в Docker:

```sh
docker-compose -f docker-compose.prod.yml up -d --build
```

Выполните миргации:

```sh
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate --noinput
```

Выполните создание супер-пользователя:

```sh
docker-compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
```

Выполните сбор статики:

```sh
docker-compose -f docker-compose.prod.yml exec web python manage.py collectstatic --no-input --clear
```


## Как получить токен пользователя и выполнить обмен с 1С

Выполните получение токена для пользователя (пр. admin):

```sh
python manage.py drf_create_token admin
```

Выполните загрузку номенклатуры из json файла:

```sh
curl -X POST -H "Content-Type: application/json" -d @media/test.json http://127.0.0.1:8000/orders/upload/products -H "Authorization: Token 0000000000000000000000000000000000000000"
```
формат json файла следующий:
```
[
    {
    "nomenclature": {
        "Идентификатор": "79291f1d-6661-11e0-9aef-0c6076a3656e",
        "ИмяТипа": "Справочник.Номенклатура",
        "Наименование": "20-00-0000-11143 Кольцо 585",
        "Удален": false
    },
    "articul": "10-10-0000-00000",
    "brand": "",
    "collection": {
        "Идентификатор": "0d032422-5bc4-11eb-ab63-005056bb1ac7",
        "ИмяТипа": "Справочник.ТипыИзделий",
        "Наименование": "Кольцо",
        "Удален": false
    },
    "size": 0,
    "weight": 1.26,
    "unit": "163",
    "stock": 0,
    "price_per_gr": 0,
    "product_type": "product"
    },...
]
```

Выполните загрузку картинок из json файла:

```sh
curl -X POST -H "Content-Type: application/json" -d @media/imgs.json http://127.0.0.1:8000/orders/upload/images -H "Authorization: Token 0000000000000000000000000000000000000000"
```
формат json файла следующий:
```
[
    {
    "nomenclature": {
        "Идентификатор": "6763b1f1-24e5-11eb-ab49-005056bb02df",
        "ИмяТипа": "Справочник.Номенклатура",
        "Наименование": "12-20-0001-23563 Серьги пуссеты 585жз ",
        "Удален": false
    },
    "filename": "8adf671b-345b-11ea-ab42-005056bb02df.jpg",
    "image": "/9j/4AAQSkZJRgABAgEBLAEsAAD/4QuARXhpZgAASUkqAAgAAAAQAAABAwABAAAA\r\n/wUAAAEBAwABAAAA/...
    },...
]
```

## Как запустить сайта
Откройте сайт в браузере по адресу [http://127.0.0.1:8000/](http://127.0.0.1:8000/). Если вы увидели пустую белую страницу, то не пугайтесь, выдохните. Просто фронтенд пока ещё не собран.
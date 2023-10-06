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

`LOG_LEVEL` - устанавливает желательный уровень логгирования сообщений:
- `DEBUG` : низкоуровневая системная информация для отладки
- `INFO` : Общая информация о системе
- `WARNING` : Информация, описывающая возникшую незначительную проблему.
- `ERROR` : Информация, описывающая возникшую серьезную проблему.
- `CRITICAL` : информация, описывающая возникшую критическую проблему.

Общая схема логгирования следующая:
- в DEBUG режиме все сообщения журнала выводятся в консоль в соответствии с заданным уровнем логгирования, сообщения об ошибках дублируются в сервисе [LogTail](https://logs.betterstack.com/).
- в PROD режиме выводятся только сообщения об ошибках в сервисе [LogTail](https://logs.betterstack.com/), они же дублируются на электронную почту администратора.

`LOGTAIL_SOURCE_TOKEN` - токен сервиса [LogTail](https://logs.betterstack.com/), который используется в качестве внешнего инструмента сбора логов.

`EMAIL_HOST` - адрес smtp сервера.
`EMAIL_PORT` - порт smtp сервера.
`EMAIL_HOST_USER` - имя пользователя от которого отправляется почта.
`EMAIL_HOST_PASSWORD` - пароль почты.
`EMAIL_USE_TLS` - TLS (по умолчанию не используется)
`EMAIL_USE_SSL` - SSL (по умолчанию включено) 

`REDIS_HOST` - адрес сервера redis
`REDIS_PORT` - порт сервера redis

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

**Откройте новый терминал**. Для работы сайта в dev-режиме необходима одновременная работа сразу двух программ `runserver` и `webpack` в режиме watch. Каждая требует себе отдельного терминала. Чтобы не выключать `runserver` откройте для фронтенда новый терминал и все нижеследующие инструкции выполняйте там.

[Установите node](https://nodejs.org/en/), если у вас его ещё нет.

Проверьте, что node и его пакетный менеджер корректно установлены. Если всё исправно, то терминал выведет их версии:

```sh
node --version
# v12.18.2

npm --version
# 6.14.5
```

Версия `node` должна быть не младше 10.0. Версия `npm` не важна.

Установите необходимые пакеты. В каталоге проекта запустите:

```sh
npm i
```

Проверьте, что `webpack` (это упаковщик веб-приложений) установлен и его версию в командной строке:

```sh
npm ls
```

Нужна именно версия webpack не ниже 5. Установите [Webpack](https://webpack.js.org/), если он еще не установлен на предыдущих шагах.:

```sh
npm i webpack webpack-cli
```

Почти всё готово. Теперь запустите сборку фронтенда и не выключайте. Webpack будет работать в фоне и следить за изменениями в JS-коде:

```sh
npm run start
```

Для stage и prod версии достаточно только собрать статику. Поэтому запустите:

```sh
npm run build
```

Дождитесь завершения сборки. Это вполне может занять 10 и более секунд. О готовности вы узнаете по сообщению в консоли:

```
webpack 5.88.2 compiled successfully in 3926 ms
```

Webpack будет следить за файлами в каталоге `src`. Он пробежиться по всем файлам и создаст полный список зависимостей в соответствии с настройками в webpack.config.js. Дальше он соберёт все файлы в большой бандл `static/main.js`. Он полностью самодостаточен и потому пригоден для запуска в браузере. Именно этот бандл сервер отправит клиенту.
Теперь все, статика для сайта собрана.

**Сбросьте кэш браузера <kbd>Ctrl-F5</kbd>.** Браузер при любой возможности старается кэшировать файлы статики: CSS, картинки и js-код. Порой это приводит к странному поведению сайта, когда код уже давно изменился, но браузер этого не замечает и продолжает использовать старую закэшированную версию. В норме Parcel решает эту проблему самостоятельно. Он следит за пересборкой фронтенда и предупреждает JS-код в браузере о необходимости подтянуть свежий код. Но если вдруг что-то у вас идёт не так, то начните ремонт со сброса браузерного кэша, жмите <kbd>Ctrl-F5</kbd>.


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

`LOG_LEVEL` - устанавливает желательный уровень логгирования сообщений

`LOGTAIL_SOURCE_TOKEN` - токен сервиса [LogTail](https://logs.betterstack.com/), который используется в качестве внешнего инструмента сбора логов.

`EMAIL_HOST` - адрес smtp сервера.
`EMAIL_PORT` - порт smtp сервера.
`EMAIL_HOST_USER` - имя пользователя от которого отправляется почта.
`EMAIL_HOST_PASSWORD` - пароль почты.
`EMAIL_USE_TLS` - TLS (по умолчанию не используется)
`EMAIL_USE_SSL` - SSL (по умолчанию включено) 

`REDIS_HOST` - адрес сервера redis
`REDIS_PORT` - порт сервера redis

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

`LOG_LEVEL` - устанавливает желательный уровень логгирования сообщений

`LOGTAIL_SOURCE_TOKEN` - токен сервиса [LogTail](https://logs.betterstack.com/), который используется в качестве внешнего инструмента сбора логов.

`EMAIL_HOST` - адрес smtp сервера.
`EMAIL_PORT` - порт smtp сервера.
`EMAIL_HOST_USER` - имя пользователя от которого отправляется почта.
`EMAIL_HOST_PASSWORD` - пароль почты.
`EMAIL_USE_TLS` - TLS (по умолчанию не используется)
`EMAIL_USE_SSL` - SSL (по умолчанию включено) 

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

Получите SSL сертификаты:

```sh
sudo nano docker-compose.prod.yml
```

закомментируйте строку следующую строку файла и сохраните его:

```
command: certonly --webroot --webroot-path=/var/www/certbot/ --email admin@cabinet-opt.ru --agree-tos --no-eff-email -d cabinet-opt.ru
```

```sh
sudo nano nginx/nginx.conf
```

раскомментируйте блок SSL и сохраните файл


Запустите заново сборку контейнеров

```sh
docker-compose -f docker-compose.prod.yml up -d --build
```

Запустите отправку заявок на почту по расписанию

```sh
docker-compose -f docker-compose.prod.yml exec web python manage.py mailing
```

## Как получить токен пользователя и выполнить обмен с 1С

Выполните получение токена для пользователя (пр. admin):

```sh
python manage.py drf_create_token admin
```

Так же токен можно получить по имени пользователя и паролю, достаточно выполнить следующий запрос к сайту:

```sh
curl -X POST -H "Content-Type: application/json" -d '{"username":"username","password":"password"}' http://127.0.0.1:8000/users/api-token-auth/
```

Выполните загрузку номенклатуры из json файла:

```sh
curl -X POST -H "Content-Type: application/json" -d @media/test.json http://127.0.0.1:8000/catalog/upload/products -H "Authorization: Token 0000000000000000000000000000000000000000"
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
    "unit": "163",
    "product_type": "product",
    "metal": "metal",
    "metal_content": "metal_content",
    "color": "color",
    "gender": "gender",
    "status": "status",
    "gem_sets": [{
        "precious_stone": {
          "Идентификатор": "0d032422-5bc4-11eb-ab63-005056bb1ac7",
          "ИмяТипа": "Справочник.ТипыКамней",
          "Наименование": "Бриллиант",
          "Удален": false  
        },
        "cut_type": {
          "Идентификатор": "0d032422-5bc4-11eb-ab63-005056bb1ac7",
          "ИмяТипа": "Справочник.Огранки",
          "Наименование": "кр57",
          "Удален": false   
        },
        "color": "color",
        "weight": 1.26,
        "quantity": 11,
        "order": 0,
        "comment": "",
        "description": ""
    }, ...]
    },...
]
```

Выполните загрузку картинок из json файла:

```sh
curl -X POST -H "Content-Type: application/json" -d @media/imgs.json http://127.0.0.1:8000/catalog/upload/images -H "Authorization: Token 0000000000000000000000000000000000000000"
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

Выполните загрузку цен из json файла:

```sh
curl -X POST -H "Content-Type: application/json" -d @media/price.json http://127.0.0.1:8000/catalog/upload/price -H "Authorization: Token 0000000000000000000000000000000000000000"
```
формат json файла следующий:
```
[
    {
    "client": {
        "Идентификатор": "7198167b-a3c8-11ed-ab73-005056bb60df",
        "ИмяТипа": "Справочник.Контрагенты",
        "Наименование": "ГОЛДЕН ПЛЮС ООО",
        "Удален": false,
        "ИНН": "3666265421"
    },
    "nomenclature": {
        "Идентификатор": "50518117-da35-11e9-ab41-005056bb02df",
        "ИмяТипа": "Справочник.Номенклатура",
        "Наименование": "П1 030 Цепь 925Ag",
        "Удален": false
    },
    "size": "45.0",
    "price": 205.5,
    "unit": "796"
    }, ...
]
```

Выполните загрузку весов, размеров и остатков номенклатуры из json файла:

```sh
curl -X POST -H "Content-Type: application/json" -d @media/stock_and_costs.json http://127.0.0.1:8000/catalog/upload/stock_and_costs -H "Authorization: Token 0000000000000000000000000000000000000000"
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
    "size": 0,
    "weight": 1.26,
    "stock": 0,
    "price_per_gr": 0
    },
]
```

Загрузка заказов с личного кабинета:

```sh
curl http://127.0.0.1:8000/orders/order/export/2004-01-01/2012-10-19 -H "Authorization: Token 0000000000000000000000000000000000000000"
```

Отправка номера заказа назначенного в 1С на сайт

```sh
curl http://127.0.0.1:8000/orders/order/update/number\?id\=0\&num\=0\&ident\=0000000000000000000000000000000000000000 -H "Authorization: Token 0000000000000000000000000000000000000000"
```

## Как запустить сайта
Откройте сайт в браузере по адресу [http://127.0.0.1:8000/](http://127.0.0.1:8000/). Если вы увидели пустую белую страницу, то не пугайтесь, выдохните и вернитесь к сборки фронтенда.
# Личный кабинет для опта на сайте talantgold.ru
Сайт создан в качестве удобного инструмента формирования и отслеживания заказов ювелирных изделий для оптовых покупателей.

Основной функционал:

    1.  Регистрация и авторизация
    2.	Карточка ЮЛ на сайте и в админке
    3.  Ассортимент и цены изделий
    4.  Карточка товара
    5.	Корзина
    6.	Заказы
    7.	Обмен данными с 1С

Сайт написан с использованием фреймворка  [Django](https://docs.djangoproject.com/en/5.0/). Форнтенд написан на языке JavaScript, без использования каких либо фреймворков. Сборка осуществляется с использованием [webpack](https://webpack.js.org). API на базе [Django rest](https://www.django-rest-framework.org).

# Содержание

- [Установка и запуск сайта](#установка-и-запуск-сайта)
  - [Как развернуть dev-версию сайта](#как-развернуть-dev-версию-сайта)
    - [Как собрать бэкенд](#как-собрать-бэкенд)
    - [Как собрать фронтенд](#как-собрать-фронтенд)
  - [Как развернуть stage-версию сайта](#как-развернуть-stage-версию-сайта)
  - [Как развернуть prod-версию сайта](#как-развернуть-prod-версию-сайта)
  - [Получение токена для пользователя (пр. admin)](#получение-токена-для-пользователя)
- [Проверить запуск сайта](#проверить-запуск-сайта)
- [Описание API проекта](#описание-api-проекта)
  - [Генерация токена по имени пользователя и паролю](#генерация-токена-по-имени-пользователя-и-паролю)
  - [Загрузка номенклатуры из json файла](#загрузка-номенклатуры-из-json-файла)
  - [Загрузка картинок из json файла](#загрузка-картинок-из-json-файла)
  - [Загрузка цен из json файла](#загрузка-цен-из-json-файла)
  - [Загрузка весов, размеров и остатков номенклатуры](#загрузка-весов-размеров-и-остатков-номенклатуры)
  - [Получение заказов с личного кабинета](#получение-заказов-с-личного-кабинета)
  - [Обновлени номера заказа назначенного в 1С на сайте](#обновлени-номера-заказа-назначенного-в-1С-на-сайте)
  - [Отправка списка менеджеров из 1С на сайт](#отправка-списка-менеджеров-из-1С-на-сайт)
  - [Удаление изображений](#удаление-изображений)


# Установка и запуск сайта

Скачайте код:
```sh
git clone https://github.com/JuliaKendo/CabinetOpt.git
```

[Установите Python](https://www.python.org/), если этого ещё не сделали.

Проверьте, что `python` установлен и корректно настроен. Запустите его в командной строке:
```sh
python --version
```
**Важно!** Версия Python должна быть не ниже 3.9 и не выше 3.10.

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

`ROLLBAR_TOKEN` - токен сервиса [rollbar](https://app.rollbar.com/), который используется в качестве внешнего инструмента сбора логов.

`EMAIL_HOST` - адрес smtp сервера.

`EMAIL_PORT` - порт smtp сервера.

`EMAIL_HOST_USER` - имя пользователя от которого отправляется почта.

`EMAIL_HOST_PASSWORD` - пароль почты.

`EMAIL_USE_TLS` - TLS (по умолчанию не используется)

`EMAIL_USE_SSL` - SSL (по умолчанию включено) 

`REDIS_HOST` - адрес сервера redis

`REDIS_PORT` - порт сервера redis

`REDIS_PWD` - пароль для авторизации на сервере redis

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

### Как собрать фронтенд

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
webpack 5.88.2 compiled successfully...
```

Webpack будет следить за файлами в каталоге `src`. Он пробежиться по всем файлам и создаст полный список зависимостей в соответствии с настройками в webpack.config.js. Дальше он соберёт все файлы в бандл `static/main.js`. Он полностью самодостаточен и потому пригоден для запуска в браузере. Именно этот бандл сервер отправит клиенту.
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

`ROLLBAR_TOKEN` - токен сервиса [rollbar](https://app.rollbar.com/), который используется в качестве внешнего инструмента сбора логов.

`EMAIL_HOST` - адрес smtp сервера.

`EMAIL_PORT` - порт smtp сервера.

`EMAIL_HOST_USER` - имя пользователя от которого отправляется почта.

`EMAIL_HOST_PASSWORD` - пароль почты.

`EMAIL_USE_TLS` - TLS (по умолчанию не используется)

`EMAIL_USE_SSL` - SSL (по умолчанию включено) 

`REDIS_HOST` - адрес сервера redis

`REDIS_PORT` - порт сервера redis

`REDIS_PWD` - пароль сервера redis

Запустите развертывание сайта в Docker:

```sh
docker-compose --env-file .env.stage up -d --build
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

`ROLLBAR_TOKEN` - токен сервиса [rollbar](https://app.rollbar.com/), который используется в качестве внешнего инструмента сбора логов.

`EMAIL_HOST` - адрес smtp сервера.

`EMAIL_PORT` - порт smtp сервера.

`EMAIL_HOST_USER` - имя пользователя от которого отправляется почта.

`EMAIL_HOST_PASSWORD` - пароль почты.

`EMAIL_USE_TLS` - TLS (по умолчанию не используется)

`EMAIL_USE_SSL` - SSL (по умолчанию включено)

`REDIS_HOST` - адрес сервера redis

`REDIS_PORT` - порт сервера redis

`REDIS_PWD` - пароль сервера redis

Запустите развертывание сайта в Docker:

```sh
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
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
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Запустите отправку заявок на почту по расписанию

без параметров запускается один раз
```sh
docker-compose -f docker-compose.prod.yml exec web python manage.py mailing
```
можно добавить комманду в расписание crontab:
```sh
crontab -e
```

с параметрами запускается в бесконечном цикле с указанным таймаутом в минутах
```sh
docker-compose -f docker-compose.prod.yml exec web python manage.py mailing --timeout 10
```

## Получение токена для пользователя

```sh
python manage.py drf_create_token admin
```

# Проверить запуск сайта
Откройте сайт в браузере по адресу [http://127.0.0.1:8000/](http://127.0.0.1:8000/). Если вы увидели пустую белую страницу, то не пугайтесь, выдохните и вернитесь к сборки фронтенда.

# Описание API проекта

### Генерация токена по имени пользователя и паролю

```sh
curl -X POST -H "Content-Type: application/json" -d '{"username":"username","password":"password"}' http://127.0.0.1:8000/users/api-token-auth/
```


### Загрузка номенклатуры из json файла

```sh
curl -X POST -H "Content-Type: application/json" -d @media/products.json http://127.0.0.1:8000/catalog/upload/products -H "Authorization: Token 0000000000000000000000000000000000000000"
```
Поля json:

`nomenclature` - Словарь с описанием загружаемой позиции номенклатуры. Обязательное поле. Содержит следующие ключи:

    `Идентификатор` - Строка, уникальный идентификатор 1С. Обязательное поле;

    `ИмяТипа` - Строка с именем типа в 1С. Допустимо пустое значение;

    `Наименование` - Строка, наименование позиции номенклатуры. Обязательное поле;

    `Удален` - Булево. Пометка на удаление для позиции номенклатуры. Обязательное поле;

`articul` - Строка, артикул номенклтуры. Обязательное поле;

`brand` - Словарь с описанием бренда. Допустимо пустое значение. Содержит следующие ключи:

    `Идентификатор` - Строка, уникальный идентификатор 1С. Обязательное поле;

    `ИмяТипа` - Строка с именем типа в 1С. Допустимо пустое значение;

    `Наименование` - Строка, наименование бренда. Обязательное поле;
        
    `Удален` - Булево. Пометка на удаление для позиции. Обязательное поле;

`group` - Строка с указанием группы коллекций. Допустимо пустое поле;

`collection` - Словарь с описанием коллекции. Обязательное поле. Содержит следующие ключи:

    `Идентификатор` - Строка, уникальный идентификатор 1С. Обязательное поле;

    `ИмяТипа` - Строка с именем типа в 1С. Допустимо пустое значение;

    `Наименование` - Строка, наименование коллекции. Обязательное поле;

    `Удален` - Булево. Пометка на удаление для позиции. Обязательное поле;

`unit` - Строка с кодом единицы измерения. Поле обязательное. Допустимые значения:

    "163" - грамм

    "796" - штуки

`product_type` - Строка с указанием типа номенклатуры. Обязательное поле. Допустимые значения:

    "product" - изделия

    "service" - услуги

    "gift_сertificate" - подарочные сертификаты

`metal` - Строка с указанием металла изделий. Допустимо пустое значение;

`metal_content` - Строка с указанием пробы металла. Допустимо пустое;

`color` - Строка с указанием цвета металла. Допустимо пустое;

`processing` - Список строка с указанием видов обработки металла. Допустимо пустое;

`gender` - Список строк с рекомендацией ношения изделий. Допустимо пустое;

`status` - Строка с указанием статуса изделия. Допустимо пустое поле. Возможные значения:
    "new" - новинка
    
    "hit" - хит продаж
    
    "sale" - распродажа
    
    "profit" - выгодная покупка
    
    "exclusive" - эксклюзив

`gift` - Список строк с описанием возможного повода для подарка. Допустимо пустое;

`design` - Список строк с описанием дизайна изделия. Допустимо пустое;

`style` - Список строк с описанием стиля изделия. Допустимо пустое;

`str_color` - Строковое представление цвета изделия. Используется для фильтрации на сайте. Обязательное поле;

`lock_type_earings` - Строка типа и размер замка серег. Допустимо пустое;

`lock_type_chain` - Строка типа и размер замка цепей. Допустимо пустое;

`lock_type_bracelet` - Строка типа и размер замка браслетов. Допустимо пустое;

`chain_width` - Ширина цепи. Целое числовое значение. По умолчанию 0;

`bracelet_width` - Ширина браслета. Целое числовое значение. По умолчанию 0;

`q_borders_c_b` - Количество граней. Целое числовое значение. По умолчанию 0;

`chain_weave` - Строка с описанием плетения (для цепей). Допустимо пустое;

`bracelet_weave` - Строка с описанием плетения (для браслетов). Допустимо пустое;

`show_on_site` - Булевое (0 или 1) значение определяющее отображение изделия на сайте. Обязательное поле;

`mark_description` - Строка с описанием изделия. Допустимо пустое значение; 

`gem_sets` - Список словарей с описанием вставок. Допустимо пустое. Словари содержат следующие ключи:

    `precious_stone` - Строка с наименованием камня. Обязательное поле;
    
    `precious_filter` - Строка с описанием группы каменй. Используется в фильтрах на сайте. Поле обязательное;

    `cut_type` - Строка с описанием вида огранки. Допустимо пустое;

    `color` - Цвет вставки. Допустимо пустое;

    `color_filter` - Цвет вставки для фильтрации на сайте. Обязательное поле;

    `weight` - Вес камней. Вещественное число. Необязательное поле;

    `quantity` - Количество камней. Целое число число. Необязательное поле;

    `order` - Порядок отображения вставок. Целое число. Обязательное поле;

    `comment` - Строка с описанием вставки. Допустимо пустое значение;

    `description` - Текст с описанием вставки. Допустимо пустое значение;

    `size_dop` -  Словарь с описание размера изделия. Допустимо пустое значение. Включает следующие поля:

        `Наименование` - Строковое представление размера изделия. Обязательное поле;

        `диапазон_от` - Число с указанием размера изделия. Обязательное поле;

        `диапазон_до` - Число с указанием врехней границы размера изделия. Допустимо пустое значение;

пример json:
```
[
{
"nomenclature": {
    "Идентификатор": "0c68f3a8-602e-11ed-ab61-005056bb07df",
    "ИмяТипа": "Справочник.Номенклатура",
    "Наименование": "Браслет полновесный  из серебра 925 пробы",
    "Удален": false
},
"articul": "40-72-0001-34222",
"brand": {
    "Идентификатор": "e1ab5cd5-499a-11ed-ab61-005056bb07df",
    "ИмяТипа": "Справочник.тл_Бренды",
    "Наименование": "TALANT Silver",
    "Удален": false
},
"collection": {
    "Идентификатор": "ccd87b30-c4f9-11ee-ab7c-005056bb60df",
    "ИмяТипа": "Справочник.тл_ВидыБраслетов",
    "Наименование": "Полновесные",
    "Удален": false
},
"group": "Браслеты",
"unit": "163",
"metal": "Серебро",
"metal_content": 925,
"color": "Белый",
"gender": [
    "Для женщин"
],
"processing": [
    "Родирование белое"
],
"gift": [
    "День рождения",
    "новый год"
],
"design": [],
"style": [],
"gem_sets": [
    {
        "precious_stone": "Фианит",
        "precious_filter": "Синтетические",
        "cut_type": "Круг",
        "color": "Бесцветный",
        "color_filter": "Бесцветный",
        "weight": 0.142,
        "quantity": 79,
        "order": 1,
        "comment": "",
        "description": "79 Фианит Кр 1.0 б/цв 0.142",
        "size_dop": {
            "Наименование": "18.0",
            "диапазон_от": 18,
            "диапазон_до": ""
        }
    }
],
"str_color": "Серебро 925 родирование",
"lock_type_earings": "",
"lock_type_chain": "",
"lock_type_bracelet": "\"Без замка\"",
"chain_width": 0,
"bracelet_width": 0,
"q_borders_c_b": 0,
"chain_weave": "",
"bracelet_weave": "\"Панцирь двойной\"",
"show_on_site": 1,
"mark_description": "Стильный серебряный браслет для шармов-бусин.",
"product_type": "product",
"status": ""
}
]
```


### Загрузка картинок из json файла

```sh
curl -X POST -H "Content-Type: application/json" -d @media/imgs.json http://127.0.0.1:8000/catalog/upload/images -H "Authorization: Token 0000000000000000000000000000000000000000"
```

Поля json:

`nomenclature` - Словарь с описанием загружаемой позиции номенклатуры. Обязательное поле. Содержит следующие ключи:

    `Идентификатор` - Строка, уникальный идентификатор 1С. Обязательное поле;

    `ИмяТипа` - Строка с именем типа в 1С. Допустимо пустое значение;

    `Наименование` - Строка, наименование позиции номенклатуры. Обязательное поле;

    `Удален` - Булево. Пометка на удаление для позиции номенклатуры. Обязательное поле;

`filename` - Строка с именем файла. Обязательное поле;

`order` - Целое число - порядок отображения картинок на сайте, по возрастанию. По умолчанию 1. Обязательное поле;

`image` - Файл строкой в формате base64.  Обязательное поле;

Пример json строки:
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
    "order": 1,
    "image": "/9j/4AAQSkZJRgABAgEBLAEsAAD/4QuARXhpZgAASUkqAAgAAAAQAAABAwABAAAA\r\n/wUAAAEBAwABAAAA/...
    },...
]
```

### Загрузка цен из json файла

```sh
curl -X POST -H "Content-Type: application/json" -d @media/price.json http://127.0.0.1:8000/catalog/upload/price -H "Authorization: Token 0000000000000000000000000000000000000000"
```

Поля json:

`price_type` - Словарь с описанием данных для персонализации цен изделий. Необязательное поле. По умолчанию тип цены "Базовая". Содержит следующие ключи:

    `Идентификатор` - Строка, уникальный идентификатор 1С. Обязательное поле;

    `ИмяТипа` - Строка с именем типа в 1С. Допустимо пустое значение;

    `Наименование` - Строка, наименование типа цен. Обязательное поле;

    `Удален` - Булево. Пометка на удаление для позиции номенклатуры. Обязательное поле;

    `ИНН` - Строка, ИНН клиента, для персонализированного типа цен. Обязательное поле;

`nomenclature` - Словарь с описанием загружаемой позиции номенклатуры. Обязательное поле. Содержит следующие ключи:

    `Идентификатор` - Строка, уникальный идентификатор 1С. Обязательное поле;

    `ИмяТипа` - Строка с именем типа в 1С. Допустимо пустое значение;

    `Наименование` - Строка, наименование позиции номенклатуры. Обязательное поле;

    `Удален` - Булево. Пометка на удаление для позиции номенклатуры. Обязательное поле;

`size` - Строка со строковым представлением размера изделия. Допустимо пустое значение;

`price` - Вещественное число - стоимость единицы. Обязательное поле;

`unit` - Строка с кодом единицы измерения. Допустимые значение "163" - грамм и "796" - штуки. Обязательное поле;

`begin_date` - Дата начала действия цен в формате %Y%m%d. Необязательное поле;

`begin_time` - Время начала действия цен в формате %H:%M:%S. Необязательное поле;

`end_date` - Дата окончания действия цен в формате %Y%m%d. Необязательное поле;

`end_time` - Время окончания действия цен в формате %H:%M:%S. Необязательное поле;

Пример json строки:
```
[
    {
    "price_type": {
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

### Загрузка весов, размеров и остатков номенклатуры

```sh
curl -X POST -H "Content-Type: application/json" -d @media/stock_and_costs.json http://127.0.0.1:8000/catalog/upload/stock_and_costs -H "Authorization: Token 0000000000000000000000000000000000000000"
```

Поля json:

`nomenclature` - Словарь с описанием загружаемой позиции номенклатуры. Обязательное поле. Содержит следующие ключи:

    `Идентификатор` - Строка, уникальный идентификатор 1С. Обязательное поле;

    `ИмяТипа` - Строка с именем типа в 1С. Допустимо пустое значение;

    `Наименование` - Строка, наименование позиции номенклатуры. Обязательное поле;

    `Удален` - Булево. Пометка на удаление для позиции номенклатуры. Обязательное поле;

`size` -  Словарь с описание размера изделия. Допустимо пустое значение. Включает следующие поля:

    `Наименование` - Строковое представление размера изделия. Обязательное поле;

    `диапазон_от` - Число с указанием размера изделия. Обязательное поле;

    `диапазон_до` - Число с указанием врехней границы размера изделия. Допустимо пустое значение;

`weight` - Вес изделия. Вещественное число. Допустимы нулевые значения. Обязательное поле;

`stock` - Остаток товара. Простое число. Допустимы нулевые значения. Обязательное поле ;

`unit` - Строка с кодом единицы измерения. Допустимые значение "163" - грамм и "796" - штуки. Обязательное поле;

Пример json строки:
```
[
    {
    "nomenclature": {
        "Идентификатор": "79291f1d-6661-11e0-9aef-0c6076a3656e",
        "ИмяТипа": "Справочник.Номенклатура",
        "Наименование": "20-00-0000-11143 Кольцо 585",
        "Удален": false
    },
    "size": {
        "Наименование": "18.0",
        "диапазон_от": 18,
        "диапазон_до": ""
    },
    "weight": 1.26,
    "stock": 0,
    "unit": "796"
    },
]
```

### Получение заказов с личного кабинета

```sh
curl http://127.0.0.1:8000/orders/order/export/2004-01-01/2012-10-19 -H "Authorization: Token 0000000000000000000000000000000000000000"
```

Поля json:

`model` - Наименование модели из которой получаем данные;

`pk` - Номер заказа на сайте;

`fields` - Словарь, содержащий данные полей заказа:

    `client` - JSON с данными клиента Содержит следующие поля:

        `model` - Наименование модели из которой получаем данные;

        `pk` - Уникальный идентификатор клиента;

        `fields` - Словарь, содержащий данные клиента:

            `name` - Наименование клиента;

            `inn` - ИНН клиента;

            `registration_order` - Номер заявки о регистрации клиента на сайте;

            `created_at` - Дата создания клиента;

            `updated_at` - Дата последних исправлений данных клиента;
            
            `approved_by` - Уникальный идентификатор администратора, подтвержившего регистрацию клиента;

            `updated_by` - Уникальный идентификатор администратора, вносившего изменения в данные клиента;

            `status` - Статус клиента на сайте, может быть "active" (активный) или "locked" (временно заблокированный);

            `manager_talant` - Уникальный идентификатор ответственного администратора;
            
            `manager` - Список идентификаторов менеджеров клиента;

    `manager` - JSON с данными менеджера, создавшего заказ;

        `model` - Наименование модели из которой получаем данные;

        `pk` - Уникальный идентификатор менеджера;

        `fields` - Словарь, содержащий данные менеджера:

            `name` - Наименование менеджера;

            `email` - Адрес электронной почты менеджера;

            `phone` - Телефон менеджера, создавшего заказ;

            `login` - Логин клиента;

            `password` - Пароль клиента;

    `status` - Строка со статусом заказа. Варианты статусов:

        "introductory" - Предварительный

        "confirmed" - Подтвержден

        "paid" - Оплачен

        "shipment" - Отгрузка

        "completed" - Завершен;


    `provision` - Префикс номера заказа:
        "П" - Поставка
        "З" - Заказ;

    `created_at` - Дата создания заказа;

    `num_in_1C` - Строка с номером заказа в 1С;

    `identifier_1C` - Строка, уникальный идентификатор в 1С;

`items` - Список словарей с данными строк заказа. Содержит следующий поля:

    `model` - Наименование модели строки заказа;

    `pk` - Уникальный идентификатор строки заказа;

    `fields` - Словарь, содержащий данные строки заказа:

        `order` - Номер заказа на сайте;

        `product` - JSON представление данных номенклатуры. Описание полей см. выше;

        `unit` - Строка с кодом единицы измерения. Допустимые значение "163" - грамм и "796" - штуки;

        `series` - Серия изделия строкой;

        `uin` - Уникальный идентификатор в системе маркировки ювелирных изделий;

        `weight` - Вес изделия. Вещественное число. Допустимы нулевые значения;

        `size` -  JSON представление данных размеров изделия. Описание полей см. выше;

        `quantity` - Количество изделий. Простое число.;

        `price` - Вещественное число, цена изделия;

        `sum` - Вещественное число, стоимость заказанных изделий;

        `discount` - Вещественное число, сумма скидки;
        
        `price_type` - Список типов цен. Не используется;


### Обновлени номера заказа назначенного в 1С на сайте

```sh
curl http://127.0.0.1:8000/orders/order/update/number\?id\=0\&num\=0\&ident\=0000000000000000000000000000000000000000 -H "Authorization: Token 0000000000000000000000000000000000000000"
```

Праметры запроса:

    `id` - Номер заказа на сайте (без префиксов);

    `num` - Номер данного заказа в 1С строкой;
    
    `ident` - Строка, уникальный идентификатор заказа в 1С.


### Отправка списка менеджеров из 1С на сайт

```sh
curl -X POST -H "Content-Type: application/json" -d @media/users.json http://127.0.0.1:8000/users/upload -H "Authorization: Token 0000000000000000000000000000000000000000"
```

Поля json:

`username` - Строка, логин пользователя. Обязательное поле, пустых значений недопустимо. Может содержать только буквы, цифры и знаки @/./+/-/_.;

`name` - Строка Фамилия Имя Отчетсов. Обязательное поле, допустимы пустые значения;

`email` - Строка с электронной почтой пользователя. Обязательное поле;

`phone` - Строка с телефоном пользователя в формате +7....  Обязательное поле, допустимы пустые значения;

`gender` - Строка с указанием пола пользователя. Допустимы следующие значения: "male", "female". Обязательное поле;

`password` - Строка с паролем. Обязательное поле, не допустимы пустые значения;

Пример json строки:
```
[
    {
        "username": "...",
        "name": "...",
        "email": "..@...ru",
        "phone": "+79.....",
        "gender": "female",
        "password": "...."
    },...
]
```

### Удаление изображений

```sh
curl -X GET -H "Content-Type: application/json" http://127.0.0.1:8000/catalog/remove/images/00000000-0000-0000-0000-000000000000 -H "Authorization: Token 0000000000000000000000000000000000000000"
```

Последним параметром в запрос передается уникальный идентификатор номенклатуры в 1С, к которому необходимо удалить все привязанные изображения.

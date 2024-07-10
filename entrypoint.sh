#!/bin/sh

export DJANGO_SUPERUSER_PASSWORD=$DB_PASSWORD

if [ "$DATABASE" = "postgres" ]
then
    echo "Waiting for postgres..."

    while ! nc -z $DB_HOST $DB_PORT; do
      sleep 0.1
    done

    echo "PostgreSQL started"
fi

python manage.py flush --no-input
python manage.py migrate
python manage.py createsuperuser --noinput --username $DB_USER --email $DB_EMAIL
python manage.py rqworker default --with-scheduler & python manage.py runserver 0.0.0.0:8000

exec "$@"
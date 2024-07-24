#!/bin/sh

# Имя файла для сохранения фикстур
DATE=$(date +"%Y%m%d%H%M%S")

# Список приложений в проекте Django
# APPS=$(docker-compose -f docker-compose.prod.yml exec web  python manage.py showmigrations | awk '{print $1}' | sed '/^\[X]/d' | sort | uniq)
APPS=$(python manage.py showmigrations | awk '{print $1}' | sed '/^\[X]/d' | sort | uniq)

# Фикстуры для каждого приложения в отдельный файл
for APP in $APPS; do
    if [ -n "$APP" ]; then
        FILENAME="${APP}_${DATE}.json"
        # docker-compose -f docker-compose.prod.yml exec web python manage.py dumpdata --exclude auth.permission --exclude contenttypes $APP --indent 4 --output fixtures/$FILENAME
        python manage.py dumpdata --exclude auth.permission --exclude contenttypes $APP --indent 4 --output fixtures/$FILENAME
        echo "Fixtures for $APP saved to $FILENAME"
    else
        echo "Skipping empty app name."
    fi
done

echo "All fixtures have been saved."
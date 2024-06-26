#!/bin/bash

# Проверить наличие изменений в репозитории
git checkout main
git fetch

# Проверить, есть ли локальные изменения
if [[ $(git log HEAD..origin/main --oneline) ]]; then
    echo "Внимание: есть локальные изменения в репозитории!"
    
    # Проверить, есть ли незакоммиченные изменения
    if ! git diff-index --quiet HEAD --; then
        echo "Ошибка: есть незакоммиченные изменения в репозитории. Пожалуйста, закоммитьте или отмените изменения перед выполнением git pull."
        exit 1
    fi

    git pull
    if [ $? -eq 0 ]; then
        echo "Команда git pull выполнена успешно."
        docker-compose up -d --build
    else
        echo "Ошибка выполнения команды git pull."
    fi
else
    echo "Нет локальных изменений в репозитории."
    docker-compose up -d --build
fi

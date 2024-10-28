#!/bin/sh

docker-compose -f docker-compose.prod.yml exec -u 0 web touch /maintenance/maintenance.on

docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate

docker-compose -f docker-compose.prod.yml exec -u 0 web rm /maintenance/maintenance.on

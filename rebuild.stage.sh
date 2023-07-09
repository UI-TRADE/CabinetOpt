#!/bin/bash

if [[ `git status --porcelain` ]]; then
  git pull origin main --quiet
  docker-compose down --volumes --rmi all
  docker-compose up -d --build
fi

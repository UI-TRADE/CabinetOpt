#################
# FRONT BUILDER #
#################

FROM node:20.3.0 as builder

WORKDIR /usr/src/app/

COPY ./package.json .
COPY ./webpack.config.js .
COPY ./src ./src

RUN npm install && npm run build

###########
# FINAL #
###########

FROM python:3.9.12-alpine

WORKDIR /usr/src/app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apk update \
    && apk add postgresql-dev g++ gcc python3-dev musl-dev libxslt-dev libffi-dev freetype-dev

RUN pip install --upgrade pip
COPY ./requirements.txt .
RUN pip install -r requirements.txt

COPY ./entrypoint.sh .
RUN sed -i 's/\r$//g' /usr/src/app/entrypoint.sh
RUN chmod +x /usr/src/app/entrypoint.sh

COPY . .
COPY --from=builder /usr/src/app/static ./static

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
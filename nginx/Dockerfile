FROM nginx:mainline-alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d
COPY maintenance.html /usr/share/nginx/html

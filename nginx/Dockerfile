FROM nginx:alpine
MAINTAINER Jan Svager <jan@svager.cz>
WORKDIR /etc/nginx
COPY nginx.conf nginx.conf

# Develepmnet certificates
COPY ssl/httptest.local.crt ssl/
COPY ssl/httptest.local.key ssl/
COPY ssl/sub.httptest.local.crt ssl/
COPY ssl/sub.httptest.local.key ssl/

# Production certificates
RUN mkdir -p /etc/letsencrypt/live/www.httptest.net/
COPY ssl/sub.httptest.net.crt /etc/letsencrypt/live/www.httptest.net/fullchain.pem
COPY ssl/sub.httptest.net.key /etc/letsencrypt/live/www.httptest.net/privkey.pem

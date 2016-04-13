FROM nginx:alpine
MAINTAINER Jan Svager <jan@svager.cz>
WORKDIR /etc/nginx
COPY nginx.conf nginx.conf

# Development certificates
COPY ssl/ ssl/

# Use development certificates for production as default
RUN mkdir -p /etc/letsencrypt/live/www.httptest.net/
COPY ssl/fullchain.crt /etc/letsencrypt/live/www.httptest.net/fullchain.pem
COPY ssl/privkey.key /etc/letsencrypt/live/www.httptest.net/privkey.pem

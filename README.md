# httptest

[![Circle CI](https://circleci.com/gh/svagi/httptest.svg?style=shield)](https://circleci.com/gh/svagi/httptest)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

## Development

### Build
```
docker-compose build
```

### Run
```
docker-compose up
```

### Test
```
docker-compose run --rm api npm test
```

## Local SSL/TLS setup

For local development over SSL/TLS there are several pre-bundled self signed certificates in `nginx/ssl/`.
In order to resolve `httptest.local` address properly, you need to edit your `/etc/hosts` file. If you are using docker-machine, it should look something like this
```
192.168.99.100  httptest.local www.httptest.local
```

At this point browser probably start complain about self-signed certificates.
Best way to solve this is to trust `nginx/ssl/*.crt` certificates at system level,
which results in trusted icon (green lock) in any browser.

![trust](trust.png)

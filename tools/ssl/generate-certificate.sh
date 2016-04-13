#!/bin/sh

# Generate self signed wildcard SSL certificate with alternative names
openssl req \
  -new \
  -newkey rsa:2048 \
  -sha1 \
  -days 3650 \
  -nodes \
  -x509 \
  -keyout ssl.key \
  -out ssl.crt \
  -config openssl.cnf

#!/bin/bash

set -e

if [ "$1" = 'development' ]; then
  exec node_modules/.bin/nodemon -L \
    --watch src/ \
    --exec node_modules/.bin/babel-node src/server.js \
  & node_modules/.bin/webpack \
    --colors \
    --watch
fi

if [ "$1" = 'production' ]; then
  exec node_modules/.bin/babel src -d build \
    && node_modules/.bin/webpack --colors \
    && node build/server.js
fi

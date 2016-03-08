FROM svagi/phantomjs
MAINTAINER Jan Svager <jan@svager.cz>
ENV DEBIAN_FRONTEND='noninteractive' \
  NODE_VERSION='5.7.0' \
  OPENSSL_VERSION='1.0.2g' \
  INSTALL_DEPS='build-essential wget xz-utils' \
  RUNTIME_DEPS='ca-certificates'
RUN apt-get update \
 && apt-get install --no-install-recommends -y $INSTALL_DEPS $RUNTIME_DEPS \
 && wget -qO- https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz \
  | tar -xJ -C /usr/local --strip-components=1 \
 && wget -qO- http://www.openssl.org/source/openssl-$OPENSSL_VERSION.tar.gz | tar -xz \
 && cd /openssl-$OPENSSL_VERSION \
 && ./config --openssldir=/usr \
 && make \
 && make install \
 && apt-get purge --auto-remove -y $INSTALL_DEPS \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*
COPY package.json /usr/src/app/
WORKDIR /usr/src/app
RUN npm install --no-optional
COPY . .
CMD ["npm", "start"]

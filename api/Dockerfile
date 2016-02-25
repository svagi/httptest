FROM debian:jessie
MAINTAINER Jan Svager <jan@svager.cz>
ENV DEBIAN_FRONTEND='noninteractive' \
  NODE_VERSION='5.7.0' \
  PHANTOM_VERSION='2.1.1' \
  INSTALL_DEPS='wget xz-utils bzip2' \
  RUNTIME_DEPS='ca-certificates fontconfig'
RUN apt-get update \
 && apt-get install --no-install-recommends -y $INSTALL_DEPS $RUNTIME_DEPS \
 && wget -qO- https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz \
  | tar -xJ -C /usr/local --strip-components=1 \
 && wget -qO- https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-$PHANTOM_VERSION-linux-x86_64.tar.bz2 \
  | tar -xj -C /usr/local --strip-components=1 \
 && apt-get purge --auto-remove -y $INSTALL_DEPS \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*
COPY package.json /usr/src/app/
WORKDIR /usr/src/app
RUN npm install --no-optional
COPY . .
CMD ["npm", "start"]

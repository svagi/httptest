FROM debian:jessie
MAINTAINER Jan Svager <jan@svager.cz>
ENV DEBIAN_FRONTEND='noninteractive' \
  NODE_VERSION='5.9.1' \
  INSTALL_DEPS='build-essential wget xz-utils' \
  RUNTIME_DEPS='ca-certificates' \
  API_DATA_DIR='/data'
RUN apt-get update \
 && apt-get install --no-install-recommends -y $INSTALL_DEPS $RUNTIME_DEPS \
 && wget -qO- https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz \
  | tar -xJ -C /usr/local --strip-components=1 \
 && apt-get purge --auto-remove -y $INSTALL_DEPS \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /usr/src/app $API_DATA_DIR \
 && chmod -R 777 $API_DATA_DIR
WORKDIR /usr/src/app
VOLUME ["$API_DATA_DIR"]
COPY package.json /usr/src/app/
RUN npm install --no-optional
COPY ./src ./src
CMD ["npm", "start"]

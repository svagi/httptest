FROM node:7.2-slim
MAINTAINER Jan Svager <jan@svager.cz>
ENV TERM=xterm NODE_PORT=8000
WORKDIR /api
RUN apt-get update \
 && apt-get install --no-install-recommends -y python g++ make \
 && npm install -g node-gyp --no-optional --quiet
COPY package.json .
RUN npm install --no-optional --quiet
COPY . .
EXPOSE $NODE_PORT
ENTRYPOINT ["npm"]
CMD ["start"]

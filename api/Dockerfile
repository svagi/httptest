FROM node:5.10.1-slim
MAINTAINER Jan Svager <jan@svager.cz>
ENV API_SRC_DIR='/usr/src/app' \
    API_DATA_DIR='/data'
RUN mkdir -p $API_SRC_DIR $API_DATA_DIR \
 && chmod -R 777 $API_DATA_DIR
WORKDIR $API_SRC_DIR
VOLUME $API_DATA_DIR
COPY package.json $API_SRC_DIR
RUN npm install --no-optional
COPY ./src ./src
CMD ["npm", "start"]

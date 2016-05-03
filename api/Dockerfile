FROM node:6.0.0-slim
MAINTAINER Jan Svager <jan@svager.cz>
# Data
ENV API_DATA_DIR /data
RUN mkdir -p $API_DATA_DIR && chmod -R 777 $API_DATA_DIR
VOLUME $API_DATA_DIR
# Source
WORKDIR /api
COPY package.json .
RUN npm install --no-optional --quiet
COPY . .
CMD ["npm", "start"]

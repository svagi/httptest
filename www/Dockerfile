FROM node:5.10.1-slim
MAINTAINER Jan Svager <jan@svager.cz>
WORKDIR /usr/src/app
COPY package.json .
RUN npm install --no-optional
COPY ./src ./src
CMD ["npm", "start"]

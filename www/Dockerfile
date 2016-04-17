FROM node:5.10.1-slim
MAINTAINER Jan Svager <jan@svager.cz>
WORKDIR /www
COPY package.json .
RUN npm install --no-optional
COPY ./src ./src
COPY ./static ./static
CMD ["npm", "start"]

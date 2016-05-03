FROM node:6.0.0-slim
MAINTAINER Jan Svager <jan@svager.cz>
# Source
WORKDIR /www
COPY package.json .
RUN npm install --no-optional --quiet
COPY . .
CMD ["npm", "start"]

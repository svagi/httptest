FROM node:7.1.0-slim
MAINTAINER Jan Svager <jan@svager.cz>
ENV TERM=xterm
WORKDIR /api
COPY package.json .
RUN npm install --no-optional --quiet
COPY . .
ENV NODE_PORT=8000 NODE_ENV=production
EXPOSE 8000
ENTRYPOINT ["npm"]
CMD ["start"]

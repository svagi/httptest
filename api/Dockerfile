FROM node:7.0.0-slim
MAINTAINER Jan Svager <jan@svager.cz>
ENV TERM=xterm
WORKDIR /api
COPY package.json .
RUN npm install --no-optional --quiet
COPY . .
RUN chmod +x ./entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
CMD ["production"]

FROM node:14-buster


ENV TOKEN=''
ENV CONTAINER_NAME=''
ENV CHANNEL=''

COPY ./app/package.json ./app/package-lock.json /app/
RUN npm install

COPY server.js /app/server.js



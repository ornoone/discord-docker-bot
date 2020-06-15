FROM node:14-buster


ENV TOKEN=''
ENV CONTAINER_NAME=''
ENV CHANNEL=''

COPY ./package.json ./package-lock.json /app/
WORKDIR /app/
RUN npm install

COPY server.js /app/server.js

CMD ["node", "/app/server.js"]

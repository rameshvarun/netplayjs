FROM node:18-bookworm-slim

ADD ./src /app/src

ADD package.json /app/
ADD package-lock.json /app/
ADD tsconfig.json /app/

WORKDIR /app

RUN npm install

USER node
CMD npm start

FROM node:18

ADD ./src /app/src

ADD package.json /app/
ADD package-lock.json /app/
ADD tsconfig.json /app/

WORKDIR /app

EXPOSE 3000

RUN npm install
RUN npm run build

CMD npm start
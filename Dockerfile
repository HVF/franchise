FROM node:8.5

WORKDIR /src/franchise
COPY . .

RUN npm install
CMD ["npm", "start"]

EXPOSE 3000

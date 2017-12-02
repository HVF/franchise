FROM node as build-env

ADD ./ /work

WORKDIR /work

RUN npm install

RUN npm run-script build

FROM nginx:alpine

COPY --from=build-env /work/bundle/* /usr/share/nginx/html/

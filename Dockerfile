FROM nginx:alpine

RUN apk add --no-cache \
	git \
	nodejs \
	nodejs-npm \
	yarn

ADD ./ /franchise
WORKDIR /franchise
RUN npm i -g npx franchise-client && \
	yarn install && yarn build

RUN cp -r /franchise/bundle/* /usr/share/nginx/html && \
	rm -rf /franchise

EXPOSE 80 14645
COPY ./docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

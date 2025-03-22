FROM --platform=linux/arm64 node:18-alpine

WORKDIR /usr/src

RUN apk update

RUN apk add --no-cache bash curl

RUN yarn cache clean --force

COPY ./dist ./

COPY . .

# Run the application for production
CMD ["yarn","serve:prod"]
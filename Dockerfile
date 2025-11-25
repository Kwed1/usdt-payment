FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache gettext

RUN npm install -g http-server

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

COPY --from=builder /app/dist ./dist
ENTRYPOINT ["/app/docker-entrypoint.sh"]
EXPOSE 5173

CMD ["sh", "-c", "envsubst < dist/index.html > dist/index.tmp && mv dist/index.tmp dist/index.html && http-server dist -p 5173 -a 0.0.0.0 --proxy http://0.0.0.0:5173?"]
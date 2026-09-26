FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 4000

# Run pending migrations + seed, then start the API. Using `migrate deploy`
# (not `migrate dev`) because this is meant to run non-interactively in a
# container, including on a fresh database with no history yet.
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/server.js"]

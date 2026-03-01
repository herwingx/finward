# Finward Backend - Supabase + Prisma
# Conecta a Supabase externo (no DB local)

FROM node:20-alpine AS builder
WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm install

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN DATABASE_URL="postgresql://dummy:5432/db" npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /usr/src/app

RUN apk add --no-cache openssl wget

COPY package.json package-lock.json ./
RUN npm install --production

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN DATABASE_URL="postgresql://dummy:5432/db" npx prisma generate

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/server.js"]

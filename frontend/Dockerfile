# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias primero
COPY package.json package-lock.json* ./
RUN npm install

# Copiar el codigo fuente
COPY . .

# Variables de entorno en build-time (Deben ser provistas o leidas en ejecucion)
# En vite, las variables de entorno publicas deben inyectarse en el build
# Idealmente para self-hosted, puedes pasar build args o manejarlo dinamicamente,
# pero en single-page applications lo asimilamos aqui o las sobreescribimos.
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# Etapa 2: Produccion (Nginx)
FROM nginx:alpine

# Copiar la configuracion personalizada de nginx para soporte de SPA (Single Page Application)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Eliminar el html base de nginx y copiar nuestro build de React
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

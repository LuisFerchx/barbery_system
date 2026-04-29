# Etapa 1: Construcción (Build)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Construimos la aplicación Vite
RUN npm run build

# Etapa 2: Servidor (Nginx)
FROM nginx:alpine
# Copiamos la configuración de Nginx para la Single Page Application (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copiamos los archivos estáticos generados en la Etapa 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

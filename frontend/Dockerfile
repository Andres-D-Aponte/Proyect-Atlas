# Imagen de desarrollo para el frontend (Etapa 1). Se endurecerá con un build
# multi-stage de producción (servido detrás de Nginx) más adelante.
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4200

CMD ["npm", "start", "--", "--host", "0.0.0.0"]

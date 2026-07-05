# Imagen de desarrollo para el backend (Etapa 1). Se endurecerá con un build
# multi-stage de producción más adelante, cuando el proyecto lo requiera.
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Valor de relleno solo para que `prisma generate` no falle al construir la imagen;
# el valor real llega en tiempo de ejecución vía docker-compose (environment).
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

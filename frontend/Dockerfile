FROM node:20-alpine

WORKDIR /app

# Dependencias primero (capa cacheada)
COPY package*.json ./
RUN npm install

# Código fuente
COPY . .

EXPOSE 5173

# host: true en vite.config.js expone en 0.0.0.0 para que Docker lo reenvíe
CMD ["npm", "run", "dev"]

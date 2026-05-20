FROM node:20-alpine

WORKDIR /app

# Instalar dependencias primero (capa cacheada mientras no cambie package.json)
COPY package*.json ./
RUN npm install --omit=dev

# Copiar solo el código fuente (el .env lo inyecta docker-compose via environment:)
COPY src/ ./src/

EXPOSE 3001

CMD ["node", "src/index.js"]

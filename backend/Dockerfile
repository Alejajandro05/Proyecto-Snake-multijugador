# 1. Usamos la imagen que ya tienes (basada en las capas de Debian 13)
FROM node:25-debian13-dev

# 2. Establecemos el directorio de trabajo (la capa 6 ya lo creó, aquí lo usamos)
WORKDIR /app

# 3. Copiamos los archivos de dependencias
# Se hace antes para aprovechar el sistema de capas de Docker
COPY package*.json ./

# 4. Instalamos las dependencias de Colyseus
RUN npm install

# 5. Copiamos todo el código de tu servidor
COPY . .

# 6. Exponemos el puerto oficial de Colyseus
EXPOSE 2567

# 7. Ejecutamos el servidor en modo desarrollo
CMD ["npm", "run", "start"]
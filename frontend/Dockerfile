# Usamos la imagen dev de Debian 13 que ya tienes en Docker Desktop
FROM node:25-debian13-dev

# Directorio de trabajo
WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos las dependencias (Phaser, TypeScript, Vite)
RUN npm install

# Copiamos el resto del código (assets, src, etc.)
COPY . .

# Exponemos el puerto por defecto de Vite
EXPOSE 5173

# Ejecutamos el servidor de desarrollo 
# El flag --host es obligatorio para que Docker pueda mostrar el juego en tu navegador
CMD ["npm", "run", "dev", "--", "--host"]
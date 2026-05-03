# 🚀 Guía de Deployment: Proyecto Snake Multijugador

## 📋 Estado Actual
- ✅ Docker y Docker Compose están instalados
- ❌ Docker daemon **NO está iniciado** (requeridor para levantar contenedores)
- 📍 Proyecto ubicado en: `/home/marseille/Uni/SIQE/PS/SNAKE/Proyecto-Snake-multijugador`

---

## **PASO 1: Iniciar Docker Daemon**

El daemon de Docker necesita permisos de administrador. Ejecuta uno de estos comandos:

### Opción A: Con `sudo` (recomendado)
```bash
sudo systemctl start docker
```
Te pedirá tu contraseña. Después de ingresarla, Docker estará listo.

### Opción B: Si estás en el grupo `docker` (sin sudo)
Si tu usuario está en el grupo docker, puedes evitar sudo:
```bash
# Primero, verifica que estés en el grupo docker:
groups $USER | grep docker

# Si aparece "docker", ejecuta:
systemctl --user start docker
# O si no funciona:
/usr/bin/dockerd-rootless-setuptool.sh install
```

---

## **PASO 2: Levantar el Proyecto con Docker Compose**

Una vez que Docker esté corriendo, ve al directorio del proyecto e inicia los servicios:

```bash
cd /home/marseille/Uni/SIQE/PS/SNAKE/Proyecto-Snake-multijugador

# Iniciar los contenedores (backend + frontend + desarrollo)
docker compose up --build
```

### ¿Qué sucede?
- **Backend** (Node.js + Colyseus): Se levanta en puerto `2567` internamente
- **Frontend** (Vite): Se levanta en `http://localhost:5173`
- Los contenedores se construirán automáticamente la primera vez

---

## **PASO 3: Acceder a la Aplicación**

Una vez que los contenedores estén listos (verás logs de "Listening on port 2567"):

1. **Frontend**: Abre tu navegador en `http://localhost:5173`
2. **Backend WebSocket**: Se conecta automáticamente via `ws://localhost:2567`

---

## **PASO 4: Detener los Servicios**

Para detener todo (mantiene los contenedores):
```bash
docker compose down
```

Para detener y remover los contenedores:
```bash
docker compose down -v  # -v remueve también los volúmenes
```

Para detener Docker daemon:
```bash
sudo systemctl stop docker
```

---

## **Opciones de Deployment Alternativas**

### A: **Deployment en Producción (VPS)**
Si quieres desplegar a un servidor remoto:
```bash
# Usa el script que ejecuta en VPS:
./scripts/pull-git-and-restart-docker.sh

# O manualmente:
# 1. Sube cambios a GitHub
# 2. SSH en el VPS
# 3. Ejecuta: cd /path/to/project && ./scripts/pull-git-and-restart-docker.sh
```

### B: **Deployment sin Docker (PM2)**
Si prefieres ejecutar sin containerización:
```bash
# Backend
cd backend
npm ci && npm run build

# Frontend
cd ../frontend
npm ci && npm run build

# Iniciar con PM2
pm2 start ../backend/ecosystem.config.cjs
```

### C: **GitHub Actions (CI/CD)**
El proyecto ya tiene workflows configurados:
- Se disparan en push a `main`
- Ejecutan tests
- Despliegan automáticamente a VPS si está configurado

---

## **Troubleshooting**

### "Docker daemon not running"
```bash
# Reinicia Docker
sudo systemctl restart docker

# O verifica el estado:
sudo systemctl status docker
```

### Puerto 5173 ya está en uso
```bash
# Encuentra qué proceso usa el puerto:
lsof -i :5173

# O usa un puerto diferente:
docker compose run -p 5174:5173 frontend
```

### Error de permisos con Docker socket
```bash
# Añade tu usuario al grupo docker:
sudo usermod -aG docker $USER
# Luego cierra sesión y vuelve a abrir terminal
```

### Ver logs de contenedores
```bash
# Logs en tiempo real:
docker compose logs -f

# Solo backend:
docker compose logs -f backend

# Solo frontend:
docker compose logs -f frontend
```

---

## **Archivos de Configuración Importantes**

- **`docker-compose.yml`**: Configuración para **desarrollo local**
- **`docker-compose.prod.yml`**: Configuración para **producción**
- **`Dockerfile`** (backend y frontend): Instrucciones de construcción
- **`Caddyfile`**: Configuración del reverse proxy (producc ión)
- **`scripts/pull-git-and-restart-docker.sh`**: Script para VPS

---

## **¿Necesitas ayuda?**

1. **Verificar Docker**: `docker --version && docker compose --version`
2. **Ver contenedores activos**: `docker ps`
3. **Ver imágenes**: `docker images`
4. **Limpiar todo**: `docker system prune -a` (⚠️ Advertencia: borra todas las imágenes)

---

**Próximos pasos**: Una vez que Docker esté corriendo, ejecuta:
```bash
cd /home/marseille/Uni/SIQE/PS/SNAKE/Proyecto-Snake-multijugador
docker compose up --build
```

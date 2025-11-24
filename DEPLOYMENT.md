# 📚 GUÍA DE DESPLIEGUE A HOSTINGER VPS

## 🎯 PARTE 1: CONFIGURACIÓN INICIAL DEL VPS

### 1. Conectarse al VPS vía SSH

```bash
ssh root@tu-ip-del-vps
# O si tienes usuario específico:
ssh tu-usuario@tu-ip-del-vps
```

### 2. Actualizar el sistema

```bash
sudo apt update
sudo apt upgrade -y
```

### 3. Instalar Node.js (versión 18 LTS o superior)

```bash
# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

### 4. Instalar PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib -y

# Iniciar servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Crear base de datos y usuario
sudo -u postgres psql

# Dentro de psql, ejecutar:
CREATE DATABASE mega_hard_db;
CREATE USER mega_hard_user WITH ENCRYPTED PASSWORD 'tu-password-seguro';
GRANT ALL PRIVILEGES ON DATABASE mega_hard_db TO mega_hard_user;
ALTER DATABASE mega_hard_db OWNER TO mega_hard_user;
\q
```

### 5. Instalar PM2 (gestor de procesos)

```bash
sudo npm install -g pm2
```

### 6. Instalar Git

```bash
sudo apt install git -y
git --version
```

### 7. Configurar Firewall

```bash
# Permitir SSH, HTTP y HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 🚀 PARTE 2: DESPLIEGUE DE LA APLICACIÓN

### 1. Clonar el repositorio

```bash
# Ir al directorio de aplicaciones
cd /var/www

# Clonar tu repositorio (si usas GitHub/GitLab)
sudo git clone https://github.com/tu-usuario/mega-hard.git
# O subir archivos vía SFTP/SCP

# Cambiar permisos
sudo chown -R $USER:$USER /var/www/mega-hard
cd /var/www/mega-hard
```

### 2. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.production.example .env

# Editar con tus valores reales
nano .env

# Valores a configurar:
# DATABASE_URL="postgresql://mega_hard_user:tu-password@localhost:5432/mega_hard_db?schema=public"
# NEXTAUTH_URL="https://tudominio.com"
# NEXTAUTH_SECRET=$(openssl rand -base64 32)
# NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="tu-cloud-name"
# CLOUDINARY_API_KEY="tu-key"
# CLOUDINARY_API_SECRET="tu-secret"

# Guardar: Ctrl+O, Enter, Ctrl+X
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Configurar Prisma y crear tablas

```bash
# Generar cliente de Prisma
npx prisma generate

# Ejecutar migraciones (crear tablas)
npx prisma migrate deploy

# Opcional: Poblar datos iniciales si tienes seed
npx prisma db seed
```

### 5. Construir la aplicación

```bash
npm run build
```

### 6. Iniciar con PM2

```bash
# Crear directorio para logs
mkdir -p logs

# Crear directorio para backups
mkdir -p backups

# Iniciar aplicación con PM2
pm2 start ecosystem.config.js

# Guardar configuración de PM2
pm2 save

# Configurar PM2 para inicio automático
pm2 startup
# Copiar y ejecutar el comando que te muestra
```

### 7. Verificar que funciona

```bash
pm2 status
pm2 logs mega-hard
```

---

## 🌐 PARTE 3: CONFIGURAR NGINX COMO REVERSE PROXY

### 1. Instalar Nginx

```bash
sudo apt install nginx -y
```

### 2. Crear configuración del sitio

```bash
sudo nano /etc/nginx/sites-available/mega-hard
```

Pegar esta configuración:

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    # Logs
    access_log /var/log/nginx/mega-hard-access.log;
    error_log /var/log/nginx/mega-hard-error.log;

    # Proxy a Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Archivos estáticos
    location /_next/static {
        proxy_pass http://localhost:3000/_next/static;
        proxy_cache_bypass $http_upgrade;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Imágenes
    location /images {
        proxy_pass http://localhost:3000/images;
        add_header Cache-Control "public, max-age=31536000";
    }
}
```

### 3. Activar sitio

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/mega-hard /etc/nginx/sites-enabled/

# Probar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

### 4. Instalar SSL con Let's Encrypt (HTTPS)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# Seguir las instrucciones en pantalla
```

---

## 🔧 PARTE 4: MANEJO DE BUGS EN PRODUCCIÓN

### Estrategia: Zero-Downtime Deployment

#### Opción A: Hotfix rápido (bugs pequeños)

```bash
# 1. Conectarse al VPS
ssh usuario@tu-vps

# 2. Ir al directorio
cd /var/www/mega-hard

# 3. Hacer backup de base de datos ANTES de cualquier cambio
timestamp=$(date +%Y%m%d_%H%M%S)
pg_dump -U mega_hard_user mega_hard_db > backups/db_backup_$timestamp.sql

# 4. Obtener cambios del repositorio
git pull origin main

# 5. Si hay cambios en dependencias
npm install

# 6. Si hay cambios en schema de base de datos
npx prisma migrate deploy
npx prisma generate

# 7. Reconstruir
npm run build

# 8. Reiniciar (downtime de ~2 segundos)
pm2 restart mega-hard

# 9. Verificar logs en tiempo real
pm2 logs mega-hard
```

#### Opción B: Despliegue con script automático

```bash
# Ejecutar el script de despliegue
chmod +x deploy.sh
./deploy.sh
```

#### Opción C: Blue-Green Deployment (cero downtime)

```bash
# 1. Clonar a un directorio paralelo
cp -r /var/www/mega-hard /var/www/mega-hard-new

# 2. Aplicar cambios en mega-hard-new
cd /var/www/mega-hard-new
git pull
npm install
npm run build

# 3. Iniciar en otro puerto (ej. 3001)
pm2 start ecosystem.config.js --name mega-hard-new -- -p 3001

# 4. Probar que funciona
curl http://localhost:3001

# 5. Cambiar Nginx al nuevo puerto
sudo nano /etc/nginx/sites-available/mega-hard
# Cambiar proxy_pass a http://localhost:3001
sudo nginx -t
sudo systemctl reload nginx

# 6. Detener versión vieja
pm2 delete mega-hard

# 7. Renombrar directorios
cd /var/www
mv mega-hard mega-hard-old
mv mega-hard-new mega-hard

# 8. Cambiar Nginx de vuelta al puerto 3000
pm2 restart mega-hard
```

---

## 📊 MONITOREO Y LOGS

### Ver logs en tiempo real

```bash
# Logs de PM2
pm2 logs mega-hard

# Solo errores
pm2 logs mega-hard --err

# Logs de Nginx
sudo tail -f /var/log/nginx/mega-hard-access.log
sudo tail -f /var/log/nginx/mega-hard-error.log
```

### Monitoreo de recursos

```bash
# Dashboard de PM2
pm2 monit

# Estado de servicios
pm2 status
systemctl status nginx
systemctl status postgresql
```

### Backups automáticos

```bash
# Crear cron job para backups diarios
crontab -e

# Agregar línea:
0 2 * * * pg_dump -U mega_hard_user mega_hard_db > /var/www/mega-hard/backups/db_backup_$(date +\%Y\%m\%d).sql

# Mantener solo últimos 7 días
0 3 * * * find /var/www/mega-hard/backups -name "db_backup_*.sql" -mtime +7 -delete
```

---

## 🐛 WORKFLOW PARA CORREGIR BUGS

### 1. Desarrollo Local

```bash
# En tu PC local:
git checkout -b fix/descripcion-del-bug
# Hacer correcciones
# Probar localmente
git add .
git commit -m "fix: descripción del bug corregido"
git push origin fix/descripcion-del-bug
```

### 2. Merge a Main

```bash
# Después de probar y validar
git checkout main
git merge fix/descripcion-del-bug
git push origin main
```

### 3. Desplegar a Producción

```bash
# En el VPS:
ssh usuario@tu-vps
cd /var/www/mega-hard
./deploy.sh
```

---

## 🔄 ROLLBACK EN CASO DE ERROR CRÍTICO

### Si algo sale mal después del despliegue:

```bash
# 1. Restaurar backup de base de datos
psql -U mega_hard_user mega_hard_db < backups/db_backup_TIMESTAMP.sql

# 2. Volver a versión anterior con Git
git log --oneline  # Ver commits
git reset --hard COMMIT_ID_ANTERIOR
npm install
npm run build
pm2 restart mega-hard

# 3. Verificar
pm2 logs mega-hard
```

---

## 📝 CHECKLIST ANTES DE CADA DESPLIEGUE

- [ ] Hacer backup de base de datos
- [ ] Probar cambios localmente
- [ ] Ejecutar `npm run build` sin errores
- [ ] Verificar que .env tiene todas las variables
- [ ] Revisar logs después del despliegue
- [ ] Probar funcionalidades críticas en producción

---

## 🆘 COMANDOS DE EMERGENCIA

```bash
# Ver uso de memoria/CPU
htop

# Reiniciar todo
pm2 restart all
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Limpiar caché de Next.js
rm -rf .next
npm run build
pm2 restart mega-hard

# Ver conexiones activas a PostgreSQL
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

---

## 📞 SOPORTE HOSTINGER

- Panel: hpanel.hostinger.com
- SSH Access: Configurar desde el panel
- Base de datos: Puedes usar phpPgAdmin desde el panel

---

## 🎓 RECURSOS ADICIONALES

- [Documentación Next.js Deploy](https://nextjs.org/docs/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [PostgreSQL Backup](https://www.postgresql.org/docs/current/backup.html)

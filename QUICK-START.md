# 🚀 GUÍA RÁPIDA DE DESPLIEGUE

## 📋 ANTES DE EMPEZAR

**Necesitas tener:**
1. Acceso SSH a tu VPS de Hostinger
2. Dominio configurado apuntando a la IP del VPS
3. Cuenta de Cloudinary para imágenes

---

## ⚡ DESPLIEGUE EN 5 PASOS

### PASO 1: Preparar VPS (primera vez solamente)

```bash
# Conectarse al VPS
ssh root@tu-ip-vps

# Instalar todo lo necesario
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs postgresql postgresql-contrib nginx git
sudo npm install -g pm2

# Configurar PostgreSQL
sudo -u postgres psql
CREATE DATABASE mega_hard_db;
CREATE USER mega_hard_user WITH ENCRYPTED PASSWORD 'TU_PASSWORD_AQUI';
GRANT ALL PRIVILEGES ON DATABASE mega_hard_db TO mega_hard_user;
ALTER DATABASE mega_hard_db OWNER TO mega_hard_user;
\q
```

### PASO 2: Subir el proyecto

```bash
# Opción A: Con Git (recomendado)
cd /var/www
git clone https://github.com/tu-usuario/mega-hard.git

# Opción B: Con SFTP
# Usa FileZilla o WinSCP para subir la carpeta completa
# Ruta destino: /var/www/mega-hard
```

### PASO 3: Configurar variables de entorno

```bash
cd /var/www/mega-hard
cp .env.production.example .env
nano .env

# Editar estos valores:
DATABASE_URL="postgresql://mega_hard_user:TU_PASSWORD@localhost:5432/mega_hard_db?schema=public"
NEXTAUTH_URL="https://tudominio.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="tu-cloud-name"
CLOUDINARY_API_KEY="tu-key"
CLOUDINARY_API_SECRET="tu-secret"

# Guardar: Ctrl+O, Enter, Ctrl+X
```

### PASO 4: Instalar y construir

```bash
cd /var/www/mega-hard
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

### PASO 5: Iniciar aplicación

```bash
# Crear directorios necesarios
mkdir -p logs backups

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Ejecutar el comando que te muestra PM2

# Verificar
pm2 status
pm2 logs mega-hard
```

---

## 🌐 CONFIGURAR NGINX Y SSL

```bash
# Crear configuración de Nginx
sudo nano /etc/nginx/sites-available/mega-hard
```

Pegar:

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/mega-hard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Instalar SSL (HTTPS)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

---

## 🐛 ARREGLAR BUGS EN PRODUCCIÓN

### Método Simple (recomendado)

```bash
# En tu PC local:
# 1. Arreglar el bug
# 2. Probar localmente
# 3. Hacer commit y push
git add .
git commit -m "fix: descripción del bug"
git push origin main

# En el VPS:
ssh usuario@tu-vps
cd /var/www/mega-hard
./deploy.sh  # <-- Este script hace todo automáticamente
```

### ¿Qué hace deploy.sh?

1. Detiene la aplicación
2. Hace backup de la base de datos
3. Descarga los cambios nuevos
4. Instala dependencias
5. Ejecuta migraciones
6. Reconstruye la aplicación
7. Reinicia todo

**Downtime:** ~30-60 segundos

---

## 🆘 COMANDOS DE EMERGENCIA

```bash
# Ver logs en tiempo real
pm2 logs mega-hard

# Reiniciar aplicación
pm2 restart mega-hard

# Ver estado
pm2 status

# Reiniciar Nginx
sudo systemctl restart nginx

# Restaurar backup de base de datos
cd /var/www/mega-hard
psql -U mega_hard_user mega_hard_db < backups/db_backup_TIMESTAMP.sql
```

---

## 📊 MONITOREO

```bash
# Dashboard interactivo
pm2 monit

# Ver uso de recursos
htop

# Ver logs de Nginx
sudo tail -f /var/log/nginx/mega-hard-access.log
```

---

## ✅ CHECKLIST POST-DESPLIEGUE

Después de desplegar, verifica:

1. [ ] La aplicación carga en https://tudominio.com
2. [ ] Puedes hacer login
3. [ ] Las imágenes de Cloudinary se cargan
4. [ ] Puedes crear un servicio de prueba
5. [ ] Los PDFs se generan correctamente
6. [ ] La base de datos responde

---

## 🔄 WORKFLOW DIARIO

### Para actualizar en producción:

```bash
# LOCAL: Hacer cambios y pushear
git add .
git commit -m "mensaje"
git push

# VPS: Actualizar
ssh usuario@vps
cd /var/www/mega-hard
./deploy.sh
```

**¡Así de simple!**

---

## 📞 AYUDA

Si algo no funciona:

1. Revisa logs: `pm2 logs mega-hard`
2. Verifica servicios: `pm2 status` y `sudo systemctl status nginx`
3. Consulta el archivo [DEPLOYMENT.md](DEPLOYMENT.md) completo para más detalles

---

## 💡 TIPS IMPORTANTES

1. **SIEMPRE** haz backup antes de desplegar
2. Prueba cambios localmente primero
3. Usa `./deploy.sh` para actualizaciones
4. Monitorea los logs después de cada despliegue
5. Ten a mano el comando de rollback por si acaso

---

## 🎯 PRÓXIMOS PASOS

Después del primer despliegue:

1. Configurar backups automáticos (ver DEPLOYMENT.md)
2. Configurar alertas de errores
3. Optimizar Nginx con caché
4. Configurar CDN para assets estáticos (opcional)

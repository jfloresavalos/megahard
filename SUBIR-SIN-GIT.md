# 🚀 SUBIR PROYECTO A HOSTINGER SIN GIT

## MÉTODO 1: FileZilla (RECOMENDADO)

### Paso 1: Descargar FileZilla
- Descarga: https://filezilla-project.org/download.php?type=client
- Instala la versión Cliente (no Server)

### Paso 2: Conectar a tu VPS
1. Abre FileZilla
2. Completa los campos arriba:
   - **Host**: `sftp://tu-ip-vps` o `sftp://tudominio.com`
   - **Usuario**: `root` (o el usuario que te dio Hostinger)
   - **Contraseña**: Tu contraseña del VPS
   - **Puerto**: `22`
3. Click en "Conexión rápida"

### Paso 3: Subir archivos
1. **Panel izquierdo**: Navega a `c:\Devs\mega-hard`
2. **Panel derecho**: Navega a `/var/www/` en el servidor
3. **Arrastra** toda la carpeta `mega-hard` del lado izquierdo al derecho
4. Espera a que termine (puede tomar 10-15 minutos)

### Paso 4: Dar permisos
Conecta por SSH y ejecuta:
```bash
ssh root@tu-ip-vps
cd /var/www
chmod -R 755 mega-hard
chown -R $USER:$USER mega-hard
```

---

## MÉTODO 2: WinSCP (Alternativa a FileZilla)

### Paso 1: Descargar WinSCP
- Descarga: https://winscp.net/eng/download.php
- Instala con opciones por defecto

### Paso 2: Configurar conexión
1. Abre WinSCP
2. Nueva sesión:
   - **Protocolo**: SFTP
   - **Servidor**: tu-ip-vps
   - **Puerto**: 22
   - **Usuario**: root
   - **Contraseña**: tu-contraseña
3. Click en "Login"

### Paso 3: Subir proyecto
1. Panel izquierdo: `c:\Devs\mega-hard`
2. Panel derecho: `/var/www/`
3. Arrastra la carpeta completa
4. Espera a que termine

---

## MÉTODO 3: Panel de Hostinger (Más Lento)

### Paso 1: Comprimir proyecto
1. En Windows, ve a `c:\Devs\`
2. Clic derecho en carpeta `mega-hard`
3. Enviar a → Carpeta comprimida
4. Te creará `mega-hard.zip`

### Paso 2: Subir al VPS
1. Ve a https://hpanel.hostinger.com
2. Selecciona tu VPS
3. Busca "File Manager" o "Administrador de Archivos"
4. Navega a `/var/www/`
5. Click en "Subir" y selecciona `mega-hard.zip`
6. Una vez subido, clic derecho → "Extraer"

### Paso 3: Limpiar
- Elimina el archivo `mega-hard.zip` después de extraer

---

## DESPUÉS DE SUBIR (IMPORTANTE)

Una vez que los archivos estén en el VPS, conéctate por SSH:

```bash
ssh root@tu-ip-vps
cd /var/www/mega-hard

# 1. Configurar variables de entorno
cp .env.production.example .env
nano .env
# Editar con tus valores reales, Ctrl+O para guardar, Ctrl+X para salir

# 2. Instalar dependencias
npm install

# 3. Configurar base de datos
npx prisma generate
npx prisma migrate deploy

# 4. Construir aplicación
npm run build

# 5. Crear directorios necesarios
mkdir -p logs backups

# 6. Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🔄 PARA ACTUALIZAR EN EL FUTURO (SIN GIT)

### Opción A: Actualizar archivos específicos
1. Modifica archivos en tu PC local
2. Abre FileZilla/WinSCP
3. Navega a la carpeta específica
4. Arrastra solo los archivos modificados
5. En SSH:
```bash
cd /var/www/mega-hard
npm run build
pm2 restart mega-hard
```

### Opción B: Reemplazar todo el proyecto
1. Borra la carpeta `/var/www/mega-hard` en el servidor (usando FileZilla)
2. Sube todo el proyecto de nuevo
3. Ejecuta los comandos de instalación otra vez

⚠️ **IMPORTANTE**: Antes de borrar, haz backup de:
- Archivo `.env` (contiene tus configuraciones)
- Carpeta `backups/` (contiene backups de base de datos)

---

## 📝 TIPS IMPORTANTES

1. **Primera vez**: Sube TODOS los archivos excepto:
   - `node_modules/` (se instala con npm install)
   - `.next/` (se genera con npm run build)
   - `.env` (lo creas manualmente en el servidor)

2. **Actualizaciones**: Solo sube los archivos que modificaste

3. **Backup antes de actualizar**:
```bash
ssh root@tu-vps
cd /var/www/mega-hard
timestamp=$(date +%Y%m%d_%H%M%S)
pg_dump -U mega_hard_user mega_hard_db > backups/db_backup_$timestamp.sql
```

---

## 🆘 PROBLEMAS COMUNES

### "Permission denied"
```bash
ssh root@tu-vps
chmod -R 755 /var/www/mega-hard
chown -R $USER:$USER /var/www/mega-hard
```

### "Cannot find module"
```bash
cd /var/www/mega-hard
rm -rf node_modules package-lock.json
npm install
```

### "Port 3000 already in use"
```bash
pm2 delete all
pm2 start ecosystem.config.js
```

---

## ✅ VENTAJAS DE ESTE MÉTODO

✅ No necesitas saber Git
✅ Interfaz gráfica fácil de usar
✅ Ves exactamente qué archivos estás subiendo
✅ Puedes arrastrar y soltar
✅ Puedes editar archivos directamente en el servidor

## ❌ DESVENTAJAS

❌ Más lento que Git para actualizaciones
❌ No hay historial de cambios
❌ Tienes que subir archivos manualmente cada vez
❌ Mayor riesgo de errores humanos

---

## 🎯 FLUJO DE TRABAJO RECOMENDADO

1. **Desarrollo**: Trabaja en tu PC local (`c:\Devs\mega-hard`)
2. **Prueba**: `npm run build` local para verificar errores
3. **Sube**: Usa FileZilla para subir al VPS
4. **Despliega**: SSH y ejecuta comandos de instalación/build
5. **Verifica**: Revisa que todo funcione en el dominio

---

## 📞 SIGUIENTE PASO

1. Descarga FileZilla o WinSCP
2. Obtén credenciales SSH de tu panel de Hostinger
3. Conecta y sube los archivos
4. Sigue la guía [QUICK-START.md](QUICK-START.md) desde el Paso 3

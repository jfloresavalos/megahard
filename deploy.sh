#!/bin/bash

# Script de despliegue para actualizaciones en producción
# Uso: ./deploy.sh

echo "🚀 Iniciando despliegue..."

# 1. Detener la aplicación
echo "⏸️  Deteniendo aplicación..."
pm2 stop mega-hard

# 2. Hacer backup de la base de datos
echo "💾 Creando backup de base de datos..."
timestamp=$(date +%Y%m%d_%H%M%S)
pg_dump -U postgres mega_hard_db > backups/db_backup_$timestamp.sql

# 3. Obtener últimos cambios del repositorio
echo "📥 Obteniendo últimos cambios..."
git pull origin main

# 4. Instalar dependencias si hay cambios
echo "📦 Instalando dependencias..."
npm install

# 5. Ejecutar migraciones de Prisma
echo "🔄 Ejecutando migraciones..."
npx prisma migrate deploy

# 6. Generar cliente de Prisma
echo "🔧 Generando cliente de Prisma..."
npx prisma generate

# 7. Construir aplicación
echo "🏗️  Construyendo aplicación..."
npm run build

# 8. Reiniciar aplicación
echo "▶️  Reiniciando aplicación..."
pm2 restart mega-hard

# 9. Verificar estado
echo "✅ Verificando estado..."
pm2 status

echo "🎉 Despliegue completado!"

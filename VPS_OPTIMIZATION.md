# 🚀 Optimizaciones para VPS - Problema de Lentitud en Editar Servicio

## Problema Identificado
El endpoint PUT para editar servicios se queda "cargando" indefinidamente en el VPS pero funciona rápido en local.

## Optimizaciones Realizadas en el Código

### 1. ✅ Frontend (`editar/page.tsx`)
- Agregué timeout de 30 segundos para detectar solicitudes lentas
- Mejoré logging para diagnosticar en qué paso se queda
- Mejor manejo de errores

### 2. ✅ Backend (`[id]/route.ts`)
- Reducí queries a la BD (antes hacía 3+, ahora hace 2)
- Cambié a usar IDs directos en lugar de `connect` para relaciones
- Quitamos includes de relaciones en el update (se traían relaciones innecesarias)
- Agregué try-catch para errores de cliente sin bloquear el update del servicio

## ⚠️ Recomendaciones para Optimizar el VPS

### 1. **Base de Datos - CRÍTICO**
```bash
# Conectar a PostgreSQL en el VPS
psql -U postgres -d nombre_base_datos

# Crear índices si no existen (MUCHO más rápido)
CREATE INDEX IF NOT EXISTS idx_serviciotecnico_clientedni ON "ServicioTecnico"("clienteDni");
CREATE INDEX IF NOT EXISTS idx_serviciotecnico_estado ON "ServicioTecnico"("estado");
CREATE INDEX IF NOT EXISTS idx_cliente_numerodoc ON "Cliente"("numeroDoc");
CREATE INDEX IF NOT EXISTS idx_serviciotecnico_id ON "ServicioTecnico"("id");
```

### 2. **Monitorar Recursos del VPS**
```bash
# Ver uso de CPU y RAM
top

# Ver procesos de Node.js
ps aux | grep node

# Ver conexiones de BD
netstat -an | grep postgres
```

### 3. **Logs del Servidor en VPS**
```bash
# Si usas PM2
pm2 logs

# Si usas systemd
journalctl -u nombre-servicio -f

# O revisar logs de aplicación
tail -f /var/log/app/error.log
```

### 4. **Aumentar Pool de Conexiones de Prisma**
En tu `.env` del VPS, ajusta:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public&connection_limit=20"
```

### 5. **Configurar PostgreSQL para Mejor Performance**
En `/etc/postgresql/X/main/postgresql.conf`:
```conf
max_connections = 200
shared_buffers = 256MB  # 25% de RAM disponible
effective_cache_size = 1GB
work_mem = 10MB
```

### 6. **Revisar Procesos Lentos en BD**
```sql
-- Ver queries lentas
SELECT query, calls, mean_time 
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC;

-- Ver tablas grandes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 7. **Verificar Health del VPS**
```bash
# Espacio en disco
df -h

# Memoria
free -h

# Procesos activos
top -n 1
```

## 🔍 Pasos para Diagnosticar

1. **Intenta editar un servicio en VPS y abre DevTools (F12)**
2. **Ve a la pestaña Network/Red** 
3. **Busca la solicitud PUT a `/api/servicios/[id]`**
4. **Verifica:**
   - ¿Cuánto tiempo tarda en recibir respuesta?
   - ¿Qué código de estado devuelve? (200, 500, etc)
   - ¿Hay timeout de 30 segundos?

5. **Si ves timeout, revisa logs del VPS para encontrar el cuello de botella**

## 📊 Benchmarks Esperados
- **Local:** <500ms
- **VPS con BD local:** <1s
- **VPS con BD remota:** <2-3s
- **VPS sobrecargado:** >30s (timeout)

## Siguiente Paso
Si después de estas optimizaciones sigue lento, podría ser:
- BD corrupta o con registro muy grande
- Insuficiencia de recursos (CPU/RAM/Disco)
- Problema de conexión de red

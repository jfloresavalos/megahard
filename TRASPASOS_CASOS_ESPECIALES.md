# 🆘 Casos Especiales y Manejo de Errores - Traspasos

## 📋 Tabla de Referencia Rápida

| Escenario | Usuario | Acción | Resultado | Recuperación |
|-----------|---------|--------|-----------|--------------|
| Cambio de opinión antes de enviar | Sede Origen | Anular | ✅ CANCELADO | N/A |
| Error en envío (dañado/incompleto) | Sede Destino | Rechazar | ✅ RECHAZADO | Re-solicitud automática |
| Todo OK en destino | Sede Destino | Confirmar | ✅ RECIBIDO | Requiere admin |
| Usuario intenta sin permisos | Cualquiera | Cualquier acción | ❌ 403 Forbidden | Verifica sede |
| Ya fue recibido, hay problema | Cualquiera | Anular/Rechazar | ❌ 400 Bad Request | Contacta admin |
| Usuario intenta hackear URL | Cualquiera | POST manual | ❌ 403 Forbidden | Backend lo bloquea |

---

## 🚨 Escenarios Críticos y Soluciones

### CASO 1: Error de Envío (Productos Dañados)

**Situación:**
```
Sede A envía: 10 laptops
Sede B recibe: 8 OK, 2 dañadas
```

**¿Qué hace Sede B?**
1. Clica: ⚠️ Rechazar (Error en envío)
2. Motivo: "2 unidades con pantalla rota, impacto en transporte"
3. Clica: Rechazar

**¿Qué pasa en el sistema?**
```
✅ Estado: RECHAZADO 🔴
✅ Se registra: Fecha, motivo, usuario que rechazó
✅ Sistema abre: Re-solicitud automática
✅ Sede A recibe: Notificación de rechazo
```

**¿Cómo se resuelve?**
- Opción 1: Sede A anula este y crea uno nuevo (sin los dañados)
- Opción 2: Sede A reinvía los mismos productos
- Opción 3: Contactar admin para ajuste manual

---

### CASO 2: Arrepentimiento (Antes de Recepción)

**Situación:**
```
Sede A envía: 5 productos
Después de 2 horas: "¡Esperen! No tenemos stock"
```

**¿Qué hace Sede A?**
1. Clica: ❌ Anular Traspaso
2. Motivo: "Stock insuficiente, error en cálculo"
3. Clica: Anular

**¿Qué pasa en el sistema?**
```
✅ Estado: CANCELADO ⚫
✅ Los productos NO se envían
✅ Si Sede B ya vio la notificación: Se actualiza a "Cancelado"
```

**Ventaja:**
- Es rápido, inmediato
- No hay costo de envío perdido
- El traspaso se cancela completamente

---

### CASO 3: Recibido pero Hay Error

**Situación:**
```
Sede B confirma recepción ✅
2 horas después: "¡Falta 1 producto!"
```

**¿Por qué es problematic?**
```
Status: RECIBIDO 🟢
  ❌ No se puede rechazar (ya fue aceptado)
  ❌ No se puede anular (ya fue aceptado)
  ❌ No se puede modificar desde UI
```

**Solución:**
1. **Contactar a Administrador**
   - Email: admin@empresa.com
   - Motivo: "Falta producto en recepción"
   - Traspaso ID: [copiar de URL]

2. **Admin puede:**
   - Cambiar estado a RECHAZADO manualmente
   - Crear ajuste de stock
   - Abrir re-solicitud
   - Generar nota de crédito

**Prevention:**
- Implementar verificación de cantidad ANTES de confirmar
- Entrenar usuarios a revisar todo antes de confirmar
- Opción: Agregar campo "Cantidad verificada" en modal

---

### CASO 4: Usuario intenta Anular (Pero no es Sede Origen)

**Situación:**
```
Sede B intenta hacer: PUT /api/traspasos/123/cancelar
Body: { accion: "CANCELAR", motivo: "..." }
```

**¿Qué pasa?**
```
Backend valida:
✅ Es usuario de Sede B? Sí
❌ Es Sede Origen? NO (el traspaso es A→B)
❌ Es Admin? No

Retorna: 403 Forbidden
Mensaje: "Solo la sede origen puede cancelar este traspaso"
```

**En Frontend:**
```javascript
alert("❌ Permiso denegado: Solo la sede origen puede cancelar este traspaso")
```

**¿Por qué es seguro?**
- No hay botón visible en UI (solo ve "Rechazar")
- Backend valida sedeId
- Si intenta URL manipulation, API lo bloquea
- Se registra el intento en logs (auditoría)

---

### CASO 5: Admin Anula/Rechaza Traspaso

**Situación:**
```
Admin necesita corregir un error
```

**¿Qué hace?**
1. Navega a Traspasos
2. Ve todos (sin restricción de sede)
3. Clica: ❌ Anular O ⚠️ Rechazar
4. Ingresa motivo: "Ajuste administrativo"
5. Clica: Anular/Rechazar

**¿Qué pasa en el sistema?**
```
✅ Backend valida: ¿Es Admin? Sí
✅ Permite la acción sin importar sede
✅ Se registra: Admin realizó la acción
```

**Ventaja:**
- Permite correcciones administrativas
- Auditoría clara de quién cambió qué
- No bloquea resolución de problemas

---

## 🔍 Auditoría y Logs

### ¿Qué se registra?

**En base de datos:**
```sql
movimiento_stock {
  id: "mov_123"
  estadoTraspaso: "RECHAZADO"
  observaciones: "2 monitores dañados"
  fechaAnulacion: 2025-11-17T14:32:00Z  ← NUEVO
  updatedAt: 2025-11-17T14:32:00Z
  usuarioRecibe_id: "user_456"  ← Quién lo rechazó
}
```

**En console (logs):**
```
📋 RECHAZAR Traspaso: { 
  id: "mov_123", 
  estadoNuevo: "RECHAZADO", 
  usuarioSedeId: "sede_B",
  esAdmin: false 
}
```

**En NextAuth session:**
- Usuario que realizó la acción
- Sede a la que pertenece
- Timestamp exacto

### ¿Cómo acceder a auditoría?

**Opción 1: Admin Dashboard (futuro)**
```
Reportes → Auditoría de Traspasos
Filtrar por: Fecha, Usuario, Acción, Sede
```

**Opción 2: Query directa a BD**
```sql
SELECT * FROM movimiento_stock 
WHERE estadoTraspaso IN ('CANCELADO', 'RECHAZADO')
AND fechaAnulacion > '2025-11-17'
ORDER BY fechaAnulacion DESC
```

---

## 📞 Escalación - Cuándo Contactar Admin

### ✅ Resuelve tu Puedes:
- Anular si eres Sede Origen y está PENDIENTE
- Rechazar si eres Sede Destino y está PENDIENTE
- Confirmar si eres Sede Destino y está PENDIENTE

### ❌ Requiere Admin:
- Modificar un traspaso RECIBIDO
- Usuario de otra sede necesita acceso
- Deshacer un CANCELADO/RECHAZADO
- Problema técnico o bug
- Auditoría o reportes especiales

### 📧 Formulario de Escalación

```
Asunto: [TRASPASOS] Necesito admin - [Tipo de problema]

Detalles:
- Traspaso ID: _______________
- Sede origen: _______________
- Sede destino: _______________
- Estado actual: _______________
- Fecha del error: _______________
- Descripción del problema:
  [Describa qué pasó y qué necesita]

Adjuntos:
- Screenshot (si aplica)
- Log de error (si aplica)
```

---

## 🛠️ Troubleshooting Técnico

### Error: "Permiso denegado"

**Posibles causas:**
1. No eres usuario de la Sede Origen/Destino
2. El traspaso es entre otros sedes
3. Tu cuenta no tiene sedeId asignada

**Solución:**
```
Verifica:
1. Login con usuario correcto
2. Navega a: Configuración → Mis Datos
3. Confirma: "Mi sede" es correcta
4. Si no está asignada, contacta admin
```

### Error: "Traspaso ya recibido"

**Significa:**
El traspaso está en estado RECIBIDO y no puede ser modificado

**Solución:**
1. Verifica que es el traspaso correcto
2. Si hay error: **Contacta admin** con:
   - Traspaso ID
   - Qué está mal
   - Qué necesitas hacer

### Error: "Acción inválida"

**Significa:**
Frontend envió "CANCELAR" o "RECHAZAR" pero API rechazó

**Solución:**
```
Actualiza el navegador:
Ctrl+Shift+R (limpia caché)
Vuelve a intentar
```

---

## 📊 Matriz de Decisiones

### "¿Puedo [ACCIÓN] este traspaso?"

```
┌─────────────────────────────────────────────────────────┐
│ ¿Estoy en la SEDE ORIGEN?                              │
├─────────────────────────────────────────────────────────┤
│ SÍ  → ¿Está en PENDIENTE?                              │
│      SÍ  → ✅ Puedo ANULAR                             │
│      NO  → ❌ No puedo modificar                       │
│                                                         │
│ NO  → ¿Estoy en la SEDE DESTINO?                       │
│      SÍ  → ¿Está en PENDIENTE?                         │
│           SÍ  → ✅ Puedo CONFIRMAR o RECHAZAR          │
│           NO  → ❌ No puedo modificar                  │
│                                                         │
│      NO  → ❌ No tengo permisos                        │
└─────────────────────────────────────────────────────────┘
```

### "¿Cómo se resuelve [PROBLEMA]?"

```
┌─────────────────────────────────────────────────────────┐
│ Cambiar opinión ANTES de recibir                       │
│ → Sede Origen ANULA                                    │
│                                                         │
│ Productos llegaron dañados                             │
│ → Sede Destino RECHAZA                                 │
│                                                         │
│ Todo está OK                                            │
│ → Sede Destino CONFIRMA                                │
│                                                         │
│ Error DESPUÉS de confirmar                             │
│ → Contacta ADMIN                                       │
│                                                         │
│ Usuario sin permisos                                   │
│ → Contacta ADMIN para asignar sede                     │
│                                                         │
│ Bug o problema técnico                                 │
│ → Contacta ADMIN + describe error                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🎓 Capacitación para Usuarios

### Script para onboarding:

**"Los traspasos tienen 3 momentos clave:"**

1. **ENVÍO (Sede Origen)**
   - "¿Queremos enviar esto?"
   - Opción: ✅ Enviar
   - Opción: ❌ Anular antes de enviar

2. **TRANSPORTE**
   - Los productos están en camino
   - No se puede hacer nada hasta llegada

3. **RECEPCIÓN (Sede Destino)**
   - "¿Llegó todo correcto?"
   - Opción: ✅ Confirmar (todo OK)
   - Opción: ⚠️ Rechazar (hay error)

**Una vez RECIBIDO:**
- No se puede deshacer
- Si hay problema: contacta admin

---

## ✅ Checklist de Implementación

- [x] Validación de sedeId en backend
- [x] Diferenciación entre CANCELADO y RECHAZADO
- [x] Mensajes de error específicos
- [x] Auditoría de cambios (fechaAnulacion)
- [x] UI condicional según permisos
- [x] Protección contra URL manipulation
- [x] Documentación completa
- [x] Casos de uso cubiertos


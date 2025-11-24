# 🔄 Guía de Permisos en Traspasos entre Sedes

## 📋 Resumen Ejecutivo

El sistema de traspasos está diseñado para controlar el flujo de productos entre sedes con validaciones claras de permisos. Cada acción (enviar, confirmar, rechazar, anular) depende de la sede y el rol del usuario.

---

## 👥 Flujo de Permisos por Rol

### 1. **ADMIN** 🔐
- ✅ Puede **confirmar recepción** en cualquier traspaso
- ✅ Puede **anular** cualquier traspaso (sede origen)
- ✅ Puede **rechazar** cualquier traspaso (sede destino)
- ✅ Puede **ver** todos los traspasos de todas las sedes

**Casos especiales:**
- Un admin puede forzar la recepción incluso si no es de la sede destino
- Un admin puede anular traspasos incluso si no es de la sede origen

---

### 2. **USUARIO NORMAL** (Con sedeId asignada)

#### **Si es de la SEDE ORIGEN** (envía el traspaso)
- ✅ Botón: **❌ Anular Traspaso**
  - Solo en estado PENDIENTE
  - Cancela completamente el envío
  - Los productos NO se envían
  - Motivo: Stock insuficiente, cancelación de pedido, etc.

- ❌ **NO puede**: Confirmar recepción
- ❌ **NO puede**: Rechazar traspaso

#### **Si es de la SEDE DESTINO** (recibe el traspaso)
- ✅ Botón: **✅ Confirmar Recepción**
  - Solo en estado PENDIENTE
  - Registra los productos como recibidos
  - Permite añadir observaciones

- ✅ Botón: **⚠️ Rechazar (Error en envío)**
  - Solo en estado PENDIENTE
  - Indica que los productos llegaron dañados/incompletos
  - Los productos vuelven a la sede origen automáticamente

- ❌ **NO puede**: Anular traspaso (eso es responsabilidad de quien envía)

#### **Si es de OTRA SEDE**
- ❌ **NO puede**: Ver botones de acción
- 🚫 Mensaje: "No tienes permisos en este traspaso (no eres sede origen ni destino)"

---

## 📊 Estados del Traspaso

```
PENDIENTE (🟡)
    ↓
    ├── [Sede Origen: Anular] → CANCELADO (⚫)
    │   └─ Los productos no se envían
    │
    └── [Sede Destino: Rechazar] → RECHAZADO (🔴)
    │   └─ Los productos vuelven a origen
    │
    └── [Sede Destino: Confirmar] → RECIBIDO (🟢)
        └─ Los productos quedan en destino
```

---

## 🔐 Validaciones de Seguridad

### Anular Traspaso (POST /api/traspasos/[id]/cancelar - acción: CANCELAR)
```
✅ Permitido si:
  - Usuario es ADMIN O
  - Usuario es de SEDE ORIGEN del traspaso

❌ Bloqueado si:
  - Traspaso ya está RECIBIDO
  - Traspaso ya está CANCELADO o RECHAZADO
  - Usuario es de otra sede (401 Forbidden)
```

### Rechazar Traspaso (PUT /api/traspasos/[id]/cancelar - acción: RECHAZAR)
```
✅ Permitido si:
  - Usuario es ADMIN O
  - Usuario es de SEDE DESTINO del traspaso

❌ Bloqueado si:
  - Traspaso ya está RECIBIDO
  - Traspaso ya está CANCELADO o RECHAZADO
  - Usuario es de otra sede (401 Forbidden)
```

### Confirmar Recepción (PUT /api/traspasos/[id]/recibir)
```
✅ Permitido si:
  - Usuario es ADMIN O
  - Usuario es de SEDE DESTINO del traspaso

❌ Bloqueado si:
  - Traspaso ya está RECIBIDO
  - Traspaso ya está CANCELADO o RECHAZADO
  - Usuario es de otra sede (401 Unauthorized)
```

---

## 🤔 Casos de Uso - Preguntas Frecuentes

### P: ¿Qué pasa si hay error de envío?
**R:** La sede DESTINO tiene dos opciones:

1. **Rechazar (⚠️)**: Si llega dañado/incompleto
   - Estado: RECHAZADO 🔴
   - Los productos vuelven a la sede origen
   - Se abre una re-solicitud automática
   - El sistema registra el motivo para auditoría

2. **Anular**: NO es responsabilidad de destino
   - Solo la sede que envía puede anular

### P: ¿Qué si reciben pero después descubren error?
**R:** Una vez que está RECIBIDO, NO se puede:
- ❌ Rechazar (demasiado tarde)
- ❌ Anular (ya fue aceptado)
- 📞 **Solución**: Comunicarse con administración para ajustes manuales

### P: ¿Los usuarios normales pueden anular?
**R:** **Sí**, pero SOLO si:
- ✅ Son de la SEDE ORIGEN que envió el traspaso
- ✅ El traspaso está en estado PENDIENTE

Si intentan sin esos requisitos, reciben error 403 "Permiso denegado"

### P: ¿Un usuario de la sede destino puede anular?
**R:** **No**. Solo puede:
- ✅ Confirmar recepción
- ✅ Rechazar (si hay error en el envío)

Anular es responsabilidad exclusiva de quien ENVÍA.

### P: ¿Qué auditoría hay?
**R:** Se registra:
- 📝 `fechaAnulacion`: Cuándo se canceló/rechazó
- 💬 `observaciones`: El motivo proporcionado por el usuario
- 👤 Usuario que realizó la acción (en sesión)
- ⏰ Timestamps automáticos

---

## 🔄 Flujo Completo - Ejemplo

### Escenario: Traspaso de Laptop de Sede A → Sede B

1. **Sede A (Origen) crea el traspaso**
   - Cantidad: 5 laptops
   - Estado: PENDIENTE 🟡

2. **Sede A ahora puede:**
   - ✅ Anular (si se arrepiente)

3. **Sede B (Destino) recibe notificación**
   - Ve el botón: "✅ Confirmar Recepción"
   - También ve: "⚠️ Rechazar (Error en envío)"

4. **Escenario A - Todo OK:**
   - Sede B clica "✅ Confirmar Recepción"
   - Añade observaciones: "Todas en buen estado"
   - Estado → RECIBIDO 🟢
   - ✅ Fin del proceso

5. **Escenario B - Problema en envío:**
   - Sede B clica "⚠️ Rechazar"
   - Motivo: "2 dañadas, 3 OK pero falta software"
   - Estado → RECHAZADO 🔴
   - Sistema abre re-solicitud automática
   - Sede A recibe notificación para corregir

6. **Escenario C - Arrepentimiento antes de envío:**
   - Sede A (antes de que Sede B reciba) clica "❌ Anular"
   - Motivo: "Stock agotado, solicitante canceló"
   - Estado → CANCELADO ⚫
   - Sede B nunca ve el traspaso

---

## 🛠️ Implementación Técnica

### Backend: `/app/api/traspasos/[id]/cancelar/route.ts`
```typescript
// Valida automáticamente:
if (accion === 'CANCELAR' && !esAdmin && usuarioSedeId !== traspasoSalida.sedeId) {
  return 403 "Solo la sede origen puede cancelar"
}

if (accion === 'RECHAZAR' && !esAdmin && usuarioSedeId !== traspasoDestino.sedeId) {
  return 403 "Solo la sede destino puede rechazar"
}
```

### Frontend: `/app/dashboard/traspasos/page.tsx`
```typescript
const obtenerAccionesPermitidas = (lote: LoteTraspaso) => {
  if (esAdmin) {
    return { puedeConfirmar: true, puedeAnular: true, puedeRechazar: true }
  }
  
  const esSedeOrigen = usuarioSedeId === lote.sedeOrigen.id
  const esSedeDestino = usuarioSedeId === lote.sedeDestino.id
  
  if (esSedeOrigen) {
    return { puedeConfirmar: false, puedeAnular: true, puedeRechazar: false }
  }
  
  if (esSedeDestino) {
    return { puedeConfirmar: true, puedeAnular: false, puedeRechazar: true }
  }
  
  return { puedeConfirmar: false, puedeAnular: false, puedeRechazar: false }
}
```

---

## ✅ Resumen de Cambios Implementados

| Característica | Antes | Después |
|---|---|---|
| **Validación de sede en backend** | ❌ No había | ✅ Validación estricta |
| **Diferencia Anular vs Rechazar** | ❌ Confuso | ✅ Claro: Origen anula, Destino rechaza |
| **Error RECIBIDO** | ❌ Mensaje genérico | ✅ Mensaje específico |
| **Permisos por rol** | ⚠️ Parcial | ✅ Completo |
| **Usuarios normales pueden anular** | ✅ Sí | ✅ Sí (si son sede origen) |
| **Auditoría de cambios** | ⚠️ Parcial | ✅ fechaAnulacion + observaciones |

---

## 📞 Soporte y Troubleshooting

**Error: "Permiso denegado"**
- ✅ Solución: Verifica que seas de la sede correcta

**Error: "Traspaso ya recibido"**
- ✅ Solución: Una vez recibido, contacta admin para cambios

**No veo botones de acción**
- ✅ Solución: Probablemente no eres de la sede origen/destino

**¿Cómo reportar problemas?**
- 📧 Contacta a: [admin email]
- 🐛 Usa ticket: [sistema de tickets]


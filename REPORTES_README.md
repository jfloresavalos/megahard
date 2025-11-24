# 📊 Módulo de Reportes - MegaHard ERP

## ✅ Implementado

### 1. **Reporte de Caja Diaria** 💰

**Ubicación:** `/dashboard/reportes/caja-diaria`

**Características:**
- ✅ Vista consolidada (todas las sedes) para Admin/Supervisor
- ✅ Vista individual para usuarios normales (solo su sede)
- ✅ Control de acceso por roles
- ✅ Desglose de ingresos:
  - Ventas completadas
  - Servicios entregados (saldo cobrado)
  - Adelantos de servicios recepcionados
- ✅ Agrupación por método de pago
- ✅ Exportación a PDF
- ✅ Exportación a Excel
- ✅ Filtro por fecha
- ✅ Selector de sede (admin/supervisor)

**Control de Acceso:**
- **Admin/Supervisor:** Puede ver todas las sedes o seleccionar una específica
- **Usuario/Vendedor/Técnico:** Solo ve su sede asignada (sin selector)

**API Endpoint:** `GET /api/reportes/caja-diaria?fecha=YYYY-MM-DD&sedeId=XXX`

---

## 📁 Estructura Creada

```
app/
├── dashboard/
│   └── reportes/
│       ├── page.tsx                    # Dashboard principal de reportes
│       └── caja-diaria/
│           └── page.tsx                # Reporte de caja diaria
│
└── api/
    └── reportes/
        └── caja-diaria/
            └── route.ts                # API endpoint

lib/
└── reportes/
    ├── queries/
    │   └── cajaDiariaQueries.ts       # Queries de Prisma
    └── generators/                     # (vacío - para futuros generadores)

components/
└── reportes/
    ├── FiltrosReporte.tsx             # Componente de filtros reutilizable
    └── ExportButtons.tsx              # Botones de exportación
```

---

## 🚀 Próximos Reportes a Implementar

### 2. **Stock y Alertas** ⚠️
- Stock actual por sucursal
- Productos bajo stock mínimo
- Valorización del inventario

### 3. **Productos Más Vendidos** 📦
- Top 10 productos
- Cantidad vendida
- Ingresos por producto

### 4. **Servicios Pendientes** 🔧
- Servicios por estado
- Servicios con fecha vencida
- Saldos pendientes de cobro

### 5. **Ventas del Mes** 📈
- Resumen mensual
- Comparativo con mes anterior
- Gráficos de tendencia

### 6. **Kardex Mejorado** 📋
- Mejora del kardex existente
- Exportación a PDF/Excel

---

## 🔧 Componentes Reutilizables

### `FiltrosReporte`
Componente inteligente que maneja:
- Filtro de fecha (simple o rango)
- Selector de sede con control de acceso por rol
- Callback automático al cambiar filtros

**Uso:**
```tsx
<FiltrosReporte
  onFiltrosChange={(filtros) => console.log(filtros)}
  mostrarRangoFechas={false}  // true para rango, false para fecha única
/>
```

### `ExportButtons`
Botones de exportación con estados de carga

**Uso:**
```tsx
<ExportButtons
  onExportPDF={exportarPDF}
  onExportExcel={exportarExcel}
/>
```

---

## 📦 Dependencias Instaladas

```json
{
  "recharts": "^2.15.0",           // Gráficos (para futuros reportes)
  "jspdf-autotable": "^3.8.4"      // Tablas en PDF
}
```

**Ya existentes:**
- `jspdf` - Generación de PDF
- `xlsx` - Exportación a Excel
- `date-fns` - Manejo de fechas

---

## 🎯 Cómo Usar

### Para Desarrolladores

1. **Crear un nuevo reporte:**
   - Crear query en `lib/reportes/queries/[nombre]Queries.ts`
   - Crear API route en `app/api/reportes/[nombre]/route.ts`
   - Crear página en `app/dashboard/reportes/[nombre]/page.tsx`
   - Reutilizar `FiltrosReporte` y `ExportButtons`

2. **Agregar al dashboard:**
   - Editar `app/dashboard/reportes/page.tsx`
   - Agregar nueva card con `disponible: true`

### Para Usuarios

1. Ir a **Reportes** en el menú lateral
2. Seleccionar el reporte deseado
3. Configurar filtros (fecha, sucursal si aplica)
4. Ver resultados en pantalla
5. Exportar a PDF o Excel según necesidad

---

## 🔐 Seguridad Implementada

- ✅ Validación de sesión en API routes
- ✅ Control de acceso por rol
- ✅ Usuarios solo ven datos de su sede
- ✅ Admins/Supervisores pueden ver todas las sedes
- ✅ Filtros aplicados en servidor (no cliente)

---

## 📊 Datos Incluidos en Caja Diaria

### Ventas
- Todas las ventas con estado `COMPLETADA` del día
- Desglosadas por método de pago
- Con información de vendedor y cliente

### Servicios Entregados
- Servicios con estado `ENTREGADO` en la fecha
- Saldo cobrado al momento de entrega
- Información de técnico

### Adelantos
- Servicios recepcionados en la fecha
- Con adelanto (`aCuenta`) mayor a 0
- Información de quien recepcionó

---

## 🐛 Troubleshooting

### "No autorizado"
- Verificar que el usuario esté logueado
- Verificar sesión de NextAuth

### "No se cargan las sedes"
- Verificar endpoint `/api/sedes`
- Verificar que haya sedes activas

### "PDF/Excel no se descarga"
- Verificar que hay datos en el reporte
- Verificar console del navegador por errores

---

## 📝 Notas Técnicas

- Las queries usan `startOfDay` y `endOfDay` de date-fns para rangos precisos
- Los totales se calculan en el servidor para mayor precisión
- Los métodos de pago se obtienen de la relación `VentaPago`
- El PDF usa `jspdf-autotable` para tablas formateadas
- El Excel usa `XLSX.utils` para múltiples hojas

---

## ✨ Mejoras Futuras

- [ ] Gráficos con Recharts
- [ ] Comparativas entre periodos
- [ ] Programación de reportes automáticos
- [ ] Envío por email
- [ ] Dashboard de reportes con widgets

# 🌱 Scripts de Seed - MEGA-HARD ERP

Los scripts de seed rellenan la base de datos con datos de prueba realistas para testing de todos los módulos.

## 📋 Seeds Disponibles

### Ejecutar todo de una vez
```bash
npm run seed:all
```

### Ejecutar seeds individuales (en orden)

1. **Usuarios de prueba**
   ```bash
   npm run seed:usuarios
   ```
   Crea 5 usuarios con diferentes roles (admin, vendedor, técnico)
   - Usuario: `jflores` / Contraseña: `admin123`
   - Usuario: `mgarcia` / Contraseña: `vendedor123`
   - Usuario: `clopez` / Contraseña: `tecnico123`

2. **Sedes**
   ```bash
   npm run seed:sedes
   ```
   Crea 4 sedes: Principal, Norte, Este, Oeste

3. **Categorías y Subcategorías**
   ```bash
   npm run seed:categorias
   ```
   Crea 5 categorías con subcategorías:
   - Computadoras (Laptops, PCs, Tablets, Chromebooks)
   - Periféricos (Monitores, Teclados, Mouse, etc.)
   - Impresoras (Inyección, Láser, Multifuncionales)
   - Accesorios (Mochilas, Fundas, Protectores)
   - Software (SO, Aplicaciones, Antivirus)

4. **Productos**
   ```bash
   npm run seed:productos
   ```
   Crea 6 productos con stock distribuido en todas las sedes:
   - Dell XPS 13
   - HP Pavilion 15
   - Lenovo ThinkPad
   - ASUS VivoBook
   - Samsung M7 Monitor
   - LG 27GP850 Monitor

5. **Clientes**
   ```bash
   npm run seed:clientes
   ```
   Crea 5 clientes empresariales con datos de contacto

6. **Servicios Técnicos Adicionales**
   ```bash
   npm run seed:servicios
   ```
   Crea 17 servicios técnicos y problemas comunes

7. **Movimientos de Stock y Traspasos**
   ```bash
   npm run seed:movimientos
   ```
   Crea:
   - 5 movimientos de entrada
   - 3 movimientos de salida
   - 3 traspasos entre sedes

## 🔐 Credenciales de Prueba

| Usuario | Rol | Contraseña |
|---------|-----|-----------|
| jflores | Admin | admin123 |
| mgarcia | Vendedor | vendedor123 |
| clopez | Técnico | tecnico123 |
| amartinez | Vendedor | vendedor123 |
| rsanchez | Técnico | tecnico123 |

## 📊 Datos Generados

### Sedes
- Madrid (Principal)
- Barcelona (Norte)
- Valencia (Este)
- Sevilla (Oeste)

### Productos Iniciales
- **Laptops**: Dell XPS 13, HP Pavilion, Lenovo ThinkPad, ASUS VivoBook
- **Monitores**: Samsung M7 32", LG 27GP850

### Clientes
- Tech Solutions SL
- Consultoría Digital
- Empresa de Servicios XYZ
- Comercio Electrónico Plus
- Startup Innovadora

### Movimientos
- Entradas de stock
- Salidas a clientes
- Traspasos entre sedes (origen ↔ destino)

## ⚠️ Notas Importantes

1. **Orden de ejecución**: Es recomendado ejecutar `npm run seed:all` para respetar dependencias
2. **Idempotencia**: Los seeds uszan `upsert`, así que son seguros ejecutar varias veces
3. **Datos aleatorios**: Los stocks y fechas son generados aleatoriamente
4. **Desarrollo solo**: Estos scripts son solo para ambiente de desarrollo

## 🐛 Troubleshooting

Si obtienes errores:

```bash
# Resetear base de datos completamente
npx prisma migrate reset

# Luego ejecutar seeds
npm run seed:all
```

## 📝 Datos de Prueba para Módulos

### Pruebas de Movimientos
- 11 movimientos totales (5 entrada, 3 salida, 3 traspasos)
- Distribuidos en múltiples sedes
- Con usuarios y fechas variadas

### Pruebas de Productos
- 6 productos en catálogo
- Stock en 4 sedes diferentes
- Precios de compra/venta realistas

### Pruebas de Clientes
- 5 clientes empresariales
- Datos de contacto completos
- Tipos de documento (NIF)

### Pruebas de Servicios
- 17 servicios adicionales técnicos
- 20 problemas comunes iniciales
- Precios sugeridos para cada servicio

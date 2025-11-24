-- CreateTable
CREATE TABLE "Sede" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'supervisor',
    "sedeId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "username" VARCHAR(255),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActividadUsuario" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActividadUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcategoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Subcategoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "garantia" TEXT,
    "precioCompra" DECIMAL(10,2) NOT NULL,
    "precioVenta" DECIMAL(10,2) NOT NULL,
    "stockMin" INTEGER NOT NULL DEFAULT 5,
    "subcategoriaId" TEXT NOT NULL,
    "imagen" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoSede" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductoSede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stockAntes" INTEGER NOT NULL,
    "stockDespues" INTEGER NOT NULL,
    "motivo" TEXT,
    "referencia" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "tipoDoc" TEXT NOT NULL DEFAULT 'DNI',
    "numeroDoc" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "razonSocial" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "numeroVenta" TEXT NOT NULL,
    "tipoComprobante" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'COMPLETADA',
    "motivoAnulacion" TEXT,
    "clienteId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaItem" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnit" DECIMAL(10,2) NOT NULL,
    "precioOriginal" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "VentaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetodoPago" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MetodoPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaPago" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "metodoPagoId" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "VentaPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoServicio" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicioTecnico" (
    "id" TEXT NOT NULL,
    "numeroServicio" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "clienteNombre" TEXT,
    "clienteDni" TEXT,
    "clienteCelular" TEXT,
    "tipoServicioId" TEXT NOT NULL,
    "tipoEquipo" TEXT NOT NULL,
    "marcaModelo" TEXT,
    "descripcionEquipo" TEXT,
    "descripcionProblema" TEXT NOT NULL,
    "problemasReportados" JSONB,
    "otrosProblemas" TEXT,
    "dejoSinCargador" BOOLEAN NOT NULL DEFAULT false,
    "dejoAccesorios" BOOLEAN NOT NULL DEFAULT false,
    "esCotizacion" BOOLEAN NOT NULL DEFAULT false,
    "faltaPernos" BOOLEAN NOT NULL DEFAULT false,
    "tieneAranaduras" BOOLEAN NOT NULL DEFAULT false,
    "otrosDetalles" TEXT,
    "diagnostico" TEXT,
    "solucion" TEXT,
    "fotosEquipo" TEXT[],
    "fotosDespues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estado" TEXT NOT NULL DEFAULT 'RECEPCIONADO',
    "prioridad" TEXT NOT NULL DEFAULT 'NORMAL',
    "costoServicio" DECIMAL(10,2),
    "costoRepuestos" DECIMAL(10,2),
    "total" DECIMAL(10,2),
    "aCuenta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "saldo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "serviciosAdicionales" JSONB,
    "metodoPago" TEXT,
    "garantiaDias" INTEGER NOT NULL DEFAULT 30,
    "fechaRecepcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEntregaEstimada" TIMESTAMP(3),
    "fechaEntregaReal" TIMESTAMP(3),
    "usuarioId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quienRecibeNombre" TEXT,
    "quienRecibeDni" TEXT,
    "productosVendidos" JSONB,

    CONSTRAINT "ServicioTecnico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicioItem" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnit" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ServicioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemaComun" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemaComun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicioAdicionalCatalogo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precioSugerido" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicioAdicionalCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionEmpresa" (
    "id" TEXT NOT NULL,
    "nombreEmpresa" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "eslogan" TEXT,
    "descripcion" TEXT,
    "logotipo" TEXT,
    "web" TEXT,
    "facebook" TEXT,
    "instagram" TEXT,
    "whatsapp" TEXT,
    "emailContacto" TEXT,
    "metodosPago" JSONB,
    "bancos" JSONB,
    "numeroPlin" TEXT,
    "numeroYape" TEXT,
    "notaFooter" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicio_historial" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT NOT NULL,
    "comentario" TEXT,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "servicio_historial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sede_nombre_key" ON "Sede"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategoria_categoriaId_nombre_key" ON "Subcategoria"("categoriaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigo_key" ON "Producto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoSede_productoId_sedeId_key" ON "ProductoSede"("productoId", "sedeId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_numeroDoc_key" ON "Cliente"("numeroDoc");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_numeroVenta_key" ON "Venta"("numeroVenta");

-- CreateIndex
CREATE UNIQUE INDEX "MetodoPago_nombre_key" ON "MetodoPago"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TipoServicio_categoria_nombre_key" ON "TipoServicio"("categoria", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ServicioTecnico_numeroServicio_key" ON "ServicioTecnico"("numeroServicio");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemaComun_nombre_key" ON "ProblemaComun"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ServicioAdicionalCatalogo_nombre_key" ON "ServicioAdicionalCatalogo"("nombre");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadUsuario" ADD CONSTRAINT "ActividadUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategoria" ADD CONSTRAINT "Subcategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES "Subcategoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoSede" ADD CONSTRAINT "ProductoSede_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoSede" ADD CONSTRAINT "ProductoSede_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaPago" ADD CONSTRAINT "VentaPago_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "MetodoPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaPago" ADD CONSTRAINT "VentaPago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioTecnico" ADD CONSTRAINT "ServicioTecnico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioTecnico" ADD CONSTRAINT "ServicioTecnico_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioTecnico" ADD CONSTRAINT "ServicioTecnico_tipoServicioId_fkey" FOREIGN KEY ("tipoServicioId") REFERENCES "TipoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioTecnico" ADD CONSTRAINT "ServicioTecnico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioItem" ADD CONSTRAINT "ServicioItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioItem" ADD CONSTRAINT "ServicioItem_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "ServicioTecnico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio_historial" ADD CONSTRAINT "servicio_historial_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "ServicioTecnico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio_historial" ADD CONSTRAINT "servicio_historial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

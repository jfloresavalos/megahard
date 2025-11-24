/*
  Warnings:

  - A unique constraint covering the columns `[traspasoRelacionadoId]` on the table `MovimientoStock` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MovimientoStock" ADD COLUMN     "estadoTraspaso" TEXT,
ADD COLUMN     "fechaAnulacion" TIMESTAMP(3),
ADD COLUMN     "fechaEnvio" TIMESTAMP(3),
ADD COLUMN     "fechaRecepcion" TIMESTAMP(3),
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "precioCompra" DECIMAL(10,2),
ADD COLUMN     "precioVenta" DECIMAL(10,2),
ADD COLUMN     "sedeDestinoId" TEXT,
ADD COLUMN     "sedeOrigenId" TEXT,
ADD COLUMN     "traspasoRelacionadoId" TEXT,
ADD COLUMN     "usuarioAnulaId" TEXT,
ADD COLUMN     "usuarioId" TEXT,
ADD COLUMN     "usuarioRecibeId" TEXT;

-- AlterTable
ALTER TABLE "ServicioTecnico" ADD COLUMN     "adelantoDevuelto" DECIMAL(10,2),
ADD COLUMN     "fechaCancelacion" TIMESTAMP(3),
ADD COLUMN     "metodoDevolucion" TEXT,
ADD COLUMN     "motivoCancelacion" TEXT,
ADD COLUMN     "observacionCancelacion" TEXT,
ADD COLUMN     "usuarioCancelacionId" TEXT;

-- CreateTable
CREATE TABLE "HistorialImportacion" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "exitosos" INTEGER NOT NULL,
    "errores" INTEGER NOT NULL,
    "detalleErrores" TEXT,
    "usuarioId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialImportacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistorialImportacion_tipo_idx" ON "HistorialImportacion"("tipo");

-- CreateIndex
CREATE INDEX "HistorialImportacion_fecha_idx" ON "HistorialImportacion"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoStock_traspasoRelacionadoId_key" ON "MovimientoStock"("traspasoRelacionadoId");

-- CreateIndex
CREATE INDEX "MovimientoStock_productoId_idx" ON "MovimientoStock"("productoId");

-- CreateIndex
CREATE INDEX "MovimientoStock_sedeId_idx" ON "MovimientoStock"("sedeId");

-- CreateIndex
CREATE INDEX "MovimientoStock_tipo_idx" ON "MovimientoStock"("tipo");

-- CreateIndex
CREATE INDEX "MovimientoStock_anulado_idx" ON "MovimientoStock"("anulado");

-- CreateIndex
CREATE INDEX "MovimientoStock_estadoTraspaso_idx" ON "MovimientoStock"("estadoTraspaso");

-- CreateIndex
CREATE INDEX "MovimientoStock_fecha_idx" ON "MovimientoStock"("fecha");

-- CreateIndex
CREATE INDEX "ServicioTecnico_estado_fechaCancelacion_idx" ON "ServicioTecnico"("estado", "fechaCancelacion");

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_usuarioAnulaId_fkey" FOREIGN KEY ("usuarioAnulaId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_sedeOrigenId_fkey" FOREIGN KEY ("sedeOrigenId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_sedeDestinoId_fkey" FOREIGN KEY ("sedeDestinoId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_traspasoRelacionadoId_fkey" FOREIGN KEY ("traspasoRelacionadoId") REFERENCES "MovimientoStock"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_usuarioRecibeId_fkey" FOREIGN KEY ("usuarioRecibeId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialImportacion" ADD CONSTRAINT "HistorialImportacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

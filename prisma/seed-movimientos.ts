import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando movimientos de stock y traspasos...')

  const productos = await prisma.producto.findMany({ take: 3 })
  const sedes = await prisma.sede.findMany()
  const usuarios = await prisma.usuario.findMany()

  if (productos.length === 0 || sedes.length < 2 || usuarios.length === 0) {
    console.log('❌ Debe ejecutar seeds de productos, sedes y usuarios primero')
    return
  }

  // Crear movimientos de entrada
  for (let i = 0; i < 5; i++) {
    const producto = productos[Math.floor(Math.random() * productos.length)]
    const sede = sedes[Math.floor(Math.random() * sedes.length)]
    const usuario = usuarios[Math.floor(Math.random() * usuarios.length)]
    const cantidad = Math.floor(Math.random() * 50) + 10

    await prisma.movimientoStock.create({
      data: {
        tipo: 'ENTRADA',
        cantidad,
        stockAntes: Math.floor(Math.random() * 100),
        stockDespues: Math.floor(Math.random() * 100) + cantidad,
        productoId: producto.id,
        sedeId: sede.id,
        usuarioId: usuario.id,
        motivo: 'Compra a proveedor',
        referencia: `COM-${Date.now()}`,
        observaciones: 'Entrada normal de stock',
        fecha: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        anulado: false
      }
    })
  }

  // Crear movimientos de salida
  for (let i = 0; i < 3; i++) {
    const producto = productos[Math.floor(Math.random() * productos.length)]
    const sede = sedes[Math.floor(Math.random() * sedes.length)]
    const usuario = usuarios[Math.floor(Math.random() * usuarios.length)]
    const cantidad = Math.floor(Math.random() * 10) + 1

    await prisma.movimientoStock.create({
      data: {
        tipo: 'SALIDA',
        cantidad,
        stockAntes: Math.floor(Math.random() * 100) + 20,
        stockDespues: Math.floor(Math.random() * 100),
        productoId: producto.id,
        sedeId: sede.id,
        usuarioId: usuario.id,
        motivo: 'Venta a cliente',
        referencia: `VTA-${Date.now()}`,
        observaciones: 'Venta realizada',
        fecha: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        anulado: false
      }
    })
  }

  // Crear traspasos entre sedes
  if (sedes.length >= 2) {
    for (let i = 0; i < 3; i++) {
      const producto = productos[Math.floor(Math.random() * productos.length)]
      const sedeOrigen = sedes[0]
      const sedeDestino = sedes[1]
      const usuario = usuarios[Math.floor(Math.random() * usuarios.length)]
      const cantidad = Math.floor(Math.random() * 30) + 5

      const movimientoOrigen = await prisma.movimientoStock.create({
        data: {
          tipo: 'TRASPASO_SALIDA',
          cantidad,
          stockAntes: 100,
          stockDespues: 100 - cantidad,
          productoId: producto.id,
          sedeId: sedeOrigen.id,
          usuarioId: usuario.id,
          motivo: 'Traspaso entre sedes',
          referencia: `TRAS-${Date.now()}-${i}`,
          observaciones: `Traspaso a ${sedeDestino.nombre}`,
          fecha: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
          anulado: false
        }
      })

      const movimientoDestino = await prisma.movimientoStock.create({
        data: {
          tipo: 'TRASPASO_ENTRADA',
          cantidad,
          stockAntes: 50,
          stockDespues: 50 + cantidad,
          productoId: producto.id,
          sedeId: sedeDestino.id,
          usuarioId: usuario.id,
          motivo: 'Recepción de traspaso',
          referencia: `TRAS-${Date.now()}-${i}`,
          observaciones: `Recepción desde ${sedeOrigen.nombre}`,
          fecha: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
          anulado: false
        }
      })

      // Relacionar movimientos
      await prisma.movimientoStock.update({
        where: { id: movimientoOrigen.id },
        data: { traspasoRelacionadoId: movimientoDestino.id }
      })

      await prisma.movimientoStock.update({
        where: { id: movimientoDestino.id },
        data: { traspasoRelacionadoId: movimientoOrigen.id }
      })
    }
  }

  console.log('✅ Movimientos de stock y traspasos creados')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

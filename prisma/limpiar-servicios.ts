import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Eliminando servicios técnicos...')

  // Primero eliminar el historial de servicios (por la relación)
  const historialEliminado = await prisma.servicioHistorial.deleteMany({})
  console.log(`✅ ${historialEliminado.count} registros de historial eliminados`)

  // Finalmente eliminar los servicios técnicos
  const serviciosEliminados = await prisma.servicioTecnico.deleteMany({})
  console.log(`✅ ${serviciosEliminados.count} servicios técnicos eliminados`)

  console.log('✅ Limpieza completada!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

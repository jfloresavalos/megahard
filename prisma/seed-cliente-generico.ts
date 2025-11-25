import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando cliente genérico...')

  // Crear cliente genérico
  const clienteGenerico = await prisma.cliente.upsert({
    where: { numeroDoc: '00000000' },
    update: {},
    create: {
      tipoDoc: 'DNI',
      numeroDoc: '00000000',
      nombre: 'Cliente Genérico',
      activo: true
    }
  })

  console.log('✅ Cliente genérico creado:', clienteGenerico.nombre)
  console.log('   DNI:', clienteGenerico.numeroDoc)
  console.log('🎉 Seed completado!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
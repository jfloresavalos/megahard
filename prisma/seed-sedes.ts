import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando sedes de prueba...')

  const sedesIniciales = [
    {
      nombre: 'Sede Principal',
      direccion: 'Av. Principal 123, Centro'
    },
    {
      nombre: 'Sede Norte',
      direccion: 'Calle Norte 456, Zona Industrial'
    },
    {
      nombre: 'Sede Este',
      direccion: 'Av. Levante 789, Parque Empresarial'
    },
    {
      nombre: 'Sede Oeste',
      direccion: 'Calle Oeste 321, Polígono Industrial'
    }
  ]

  for (const sede of sedesIniciales) {
    await prisma.sede.upsert({
      where: { nombre: sede.nombre },
      update: {},
      create: {
        nombre: sede.nombre,
        direccion: sede.direccion
      }
    })
  }

  console.log(`✅ ${sedesIniciales.length} sedes creadas`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

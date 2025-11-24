import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando clientes de prueba...')

  const clientesIniciales = [
    {
      tipoDoc: 'NIF',
      numeroDoc: '12345678A',
      nombre: 'Tech Solutions SL',
      razonSocial: 'Tech Solutions SL',
      telefono: '+34 912 34 56 78',
      direccion: 'Av. Tecnología 123'
    },
    {
      tipoDoc: 'NIF',
      numeroDoc: '87654321B',
      nombre: 'Consultoría Digital',
      razonSocial: 'Consultoría Digital SL',
      telefono: '+34 913 45 67 89',
      direccion: 'Calle Digital 456'
    },
    {
      tipoDoc: 'NIF',
      numeroDoc: '11223344C',
      nombre: 'Empresa de Servicios XYZ',
      razonSocial: 'Empresa de Servicios XYZ SL',
      telefono: '+34 914 56 78 90',
      direccion: 'Polígono Industrial 789'
    },
    {
      tipoDoc: 'NIF',
      numeroDoc: '55667788D',
      nombre: 'Comercio Electrónico Plus',
      razonSocial: 'Comercio Electrónico Plus SL',
      telefono: '+34 915 67 89 01',
      direccion: 'Av. Comercio 321'
    },
    {
      tipoDoc: 'NIF',
      numeroDoc: '99887766E',
      nombre: 'Startup Innovadora',
      razonSocial: 'Startup Innovadora SL',
      telefono: '+34 916 78 90 12',
      direccion: 'Hub de Startups 100'
    }
  ]

  for (const cliente of clientesIniciales) {
    await prisma.cliente.upsert({
      where: { numeroDoc: cliente.numeroDoc },
      update: {},
      create: cliente
    })
  }

  console.log(`✅ ${clientesIniciales.length} clientes creados`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

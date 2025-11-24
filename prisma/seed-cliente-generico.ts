import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Crear sede
  const sede = await prisma.sede.upsert({
    where: { nombre: 'Sede Principal' },
    update: {},
    create: {
      nombre: 'Sede Principal',
      direccion: 'Av. Principal 123',
      telefono: '999999999',
      activo: true
    }
  })

  console.log('✅ Sede creada:', sede.nombre)

  // Crear usuario admin con contraseña simple
  const admin = await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {
      password: 'admin123',  // ✅ Contraseña en texto plano
      activo: true
    },
    create: {
      nombre: 'Administrador',
      username: 'admin',
      email: 'admin@megahard.com',
      password: 'admin123',  // ✅ Contraseña en texto plano
      rol: 'admin',
      sedeId: sede.id,
      activo: true
    }
  })

  console.log('✅ Usuario admin creado')
  console.log('   Username: admin')
  console.log('   Password: admin123')

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

  console.log('✅ Cliente genérico creado')

  // Crear métodos de pago
  const metodosPago = ['Efectivo', 'Yape', 'Transferencia', 'Tarjeta']
  
  for (const metodo of metodosPago) {
    await prisma.metodoPago.upsert({
      where: { nombre: metodo },
      update: {},
      create: {
        nombre: metodo,
        activo: true
      }
    })
  }

  console.log('✅ Métodos de pago creados')

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
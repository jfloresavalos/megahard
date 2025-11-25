import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando usuarios de prueba...')

  // Obtener las sedes
  const sedes = await prisma.sede.findMany({
    where: { activo: true }
  })

  if (sedes.length === 0) {
    console.log('❌ No hay sedes creadas. Ejecuta seed-sedes.ts primero.')
    return
  }

  const usuariosIniciales = [
    {
      nombre: 'Juan Flores',
      email: 'jflores@megahard.com',
      username: 'jflores',
      password: 'admin123',
      rol: 'admin',
      activo: true,
      sedeId: sedes[0].id // Sede Principal
    },
    {
      nombre: 'María García',
      email: 'mgarcia@megahard.com',
      username: 'mgarcia',
      password: 'vendedor123',
      rol: 'vendedor',
      activo: true,
      sedeId: sedes[0].id // Sede Principal
    },
    {
      nombre: 'Carlos López',
      email: 'clopez@megahard.com',
      username: 'clopez',
      password: 'tecnico123',
      rol: 'tecnico',
      activo: true,
      sedeId: sedes[1].id // Sede Norte
    },
    {
      nombre: 'Ana Martínez',
      email: 'amartinez@megahard.com',
      username: 'amartinez',
      password: 'vendedor123',
      rol: 'vendedor',
      activo: true,
      sedeId: sedes[1].id // Sede Norte
    },
    {
      nombre: 'Roberto Sánchez',
      email: 'rsanchez@megahard.com',
      username: 'rsanchez',
      password: 'tecnico123',
      rol: 'tecnico',
      activo: true,
      sedeId: sedes[2].id // Sede Este
    }
  ]

  for (const usuario of usuariosIniciales) {
    // ⚠️ SIN HASH para desarrollo - password en texto plano

    await prisma.usuario.upsert({
      where: { email: usuario.email },
      update: {
        password: usuario.password, // Actualizar password también
        sedeId: usuario.sedeId
      },
      create: {
        nombre: usuario.nombre,
        email: usuario.email,
        username: usuario.username,
        password: usuario.password, // Sin hashear
        rol: usuario.rol as any,
        activo: usuario.activo,
        sedeId: usuario.sedeId
      }
    })
  }

  console.log(`✅ ${usuariosIniciales.length} usuarios creados`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

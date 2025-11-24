import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando categorías y subcategorías...')

  const categoriasData = [
    {
      nombre: 'Computadoras',
      subcategorias: ['Laptops', 'PCs de Escritorio', 'Tablets', 'Chromebooks']
    },
    {
      nombre: 'Periféricos',
      subcategorias: ['Monitores', 'Teclados', 'Mouse', 'Cables', 'Adaptadores']
    },
    {
      nombre: 'Impresoras',
      subcategorias: ['Inyección de Tinta', 'Láser', 'Multifuncionales', 'Etiquetadores']
    },
    {
      nombre: 'Accesorios',
      subcategorias: ['Mochilas', 'Fundas', 'Protectores', 'Limpiadores', 'Cargadores']
    },
    {
      nombre: 'Software',
      subcategorias: ['Sistemas Operativos', 'Aplicaciones', 'Antivirus', 'Utilitarios']
    }
  ]

  for (const catData of categoriasData) {
    const categoria = await prisma.categoria.upsert({
      where: { nombre: catData.nombre },
      update: {},
      create: { nombre: catData.nombre }
    })

    for (const subNombre of catData.subcategorias) {
      await prisma.subcategoria.upsert({
        where: {
          categoriaId_nombre: {
            nombre: subNombre,
            categoriaId: categoria.id
          }
        },
        update: {},
        create: {
          nombre: subNombre,
          categoriaId: categoria.id
        }
      })
    }
  }

  console.log(`✅ Categorías y subcategorías creadas`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando productos de prueba...')

  // Obtener categorías y sedes
  const categoriaLaptops = await prisma.categoria.findUnique({
    where: { nombre: 'Computadoras' },
    include: { subcategorias: { where: { nombre: 'Laptops' } } }
  })

  const categoriaPerif = await prisma.categoria.findUnique({
    where: { nombre: 'Periféricos' },
    include: { subcategorias: { where: { nombre: 'Monitores' } } }
  })

  const sedes = await prisma.sede.findMany()

  if (!categoriaLaptops?.subcategorias[0] || !categoriaPerif?.subcategorias[0]) {
    console.log('❌ Debe ejecutar seed de categorías primero')
    return
  }

  const productosIniciales = [
    {
      codigo: 'DELL-XPS-13',
      nombre: 'Dell XPS 13',
      descripcion: 'Laptop ultraportátil con procesador Intel Core i7',
      subcategoriaId: categoriaLaptops.subcategorias[0].id,
      precioCompra: 800,
      precioVenta: 1200,
      stock: 10
    },
    {
      codigo: 'HP-PAVILION-15',
      nombre: 'HP Pavilion 15',
      descripcion: 'Laptop versátil para trabajo y entretenimiento',
      subcategoriaId: categoriaLaptops.subcategorias[0].id,
      precioCompra: 500,
      precioVenta: 750,
      stock: 15
    },
    {
      codigo: 'LENOVO-THINKPAD',
      nombre: 'Lenovo ThinkPad E14',
      descripcion: 'Laptop profesional con excelente teclado',
      subcategoriaId: categoriaLaptops.subcategorias[0].id,
      precioCompra: 600,
      precioVenta: 900,
      stock: 12
    },
    {
      codigo: 'ASUS-VIVOBOOK',
      nombre: 'ASUS VivoBook 15',
      descripcion: 'Laptop económica con buen rendimiento',
      subcategoriaId: categoriaLaptops.subcategorias[0].id,
      precioCompra: 400,
      precioVenta: 600,
      stock: 20
    },
    {
      codigo: 'SAMSUNG-M7',
      nombre: 'Samsung M7 32"',
      descripcion: 'Monitor Smart con 4K UHD',
      subcategoriaId: categoriaPerif.subcategorias[0].id,
      precioCompra: 350,
      precioVenta: 500,
      stock: 8
    },
    {
      codigo: 'LG-27GP850',
      nombre: 'LG 27GP850',
      descripcion: 'Monitor gaming IPS 180Hz',
      subcategoriaId: categoriaPerif.subcategorias[0].id,
      precioCompra: 300,
      precioVenta: 450,
      stock: 10
    }
  ]

  for (const producto of productosIniciales) {
    const prod = await prisma.producto.upsert({
      where: { codigo: producto.codigo },
      update: {},
      create: {
        codigo: producto.codigo,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        subcategoriaId: producto.subcategoriaId,
        precioCompra: producto.precioCompra,
        precioVenta: producto.precioVenta
      }
    })

    // Crear stock en cada sede
    for (const sede of sedes) {
      await prisma.productoSede.upsert({
        where: {
          productoId_sedeId: {
            productoId: prod.id,
            sedeId: sede.id
          }
        },
        update: {},
        create: {
          productoId: prod.id,
          sedeId: sede.id,
          stock: Math.floor(Math.random() * producto.stock) + 1
        }
      })
    }
  }

  console.log(`✅ ${productosIniciales.length} productos creados con stock en todas las sedes`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

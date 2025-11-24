import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Verificar productos
    const productosCount = await prisma.producto.count()
    console.log(`📦 Total de productos: ${productosCount}`)

    const productos = await prisma.producto.findMany({
      take: 5,
      include: {
        subcategoria: {
          include: {
            categoria: true
          }
        }
      }
    })

    console.log('\n🔍 Primeros 5 productos:')
    productos.forEach(p => {
      console.log(`  - ${p.codigo} - ${p.nombre} (${p.subcategoria.categoria.nombre})`)
    })

    // Borrar traspasos
    console.log('\n🗑️  Eliminando traspasos...')

    const traspasosDeleted = await prisma.movimientoStock.deleteMany({
      where: {
        tipo: {
          in: ['TRASPASO_SALIDA', 'TRASPASO_ENTRADA']
        }
      }
    })

    console.log(`✅ ${traspasosDeleted.count} traspasos eliminados`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

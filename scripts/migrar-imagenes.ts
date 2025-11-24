import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔄 Verificando productos...')

    const productos = await prisma.producto.findMany()
    console.log(`📦 Total de productos encontrados: ${productos.length}`)

    // Verificar si algún producto tiene el campo antiguo 'imagen'
    // Como ya cambiamos el schema, todos deberían tener 'imagenes' como array vacío

    let actualizados = 0
    for (const producto of productos) {
      console.log(`  - ${producto.codigo}: imagenes = ${JSON.stringify(producto.imagenes)}`)

      // Si imagenes está vacío pero había una imagen antes (esto no se puede recuperar)
      // Solo aseguramos que imagenes sea un array válido
      if (!Array.isArray(producto.imagenes)) {
        await prisma.producto.update({
          where: { id: producto.id },
          data: { imagenes: [] }
        })
        actualizados++
      }
    }

    console.log(`✅ ${actualizados} productos actualizados`)
    console.log('✅ Migración completada')

  } catch (error) {
    console.error('❌ Error en migración:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

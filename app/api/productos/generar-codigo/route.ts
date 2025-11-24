import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { subcategoriaId } = await request.json()

    if (!subcategoriaId) {
      return NextResponse.json({ 
        success: false,
        error: 'Subcategoría requerida'
      }, { status: 400 })
    }

    // Obtener la subcategoría con su categoría
    const subcategoria = await prisma.subcategoria.findUnique({
      where: { id: subcategoriaId },
      include: { categoria: true }
    })

    if (!subcategoria) {
      return NextResponse.json({ 
        success: false,
        error: 'Subcategoría no encontrada'
      }, { status: 404 })
    }

    // Generar prefijo basado en la categoría
    let prefijo = ''
    const nombreCategoria = subcategoria.categoria.nombre.toUpperCase()
    
    if (nombreCategoria.includes('COMPUTADORA')) {
      if (subcategoria.nombre.includes('Laptop')) {
        prefijo = 'LAP'
      } else if (subcategoria.nombre.includes('PC')) {
        prefijo = 'PC'
      } else {
        prefijo = 'COMP'
      }
    } else if (nombreCategoria.includes('IMPRESORA')) {
      prefijo = 'IMP'
    } else if (nombreCategoria.includes('ACCESORIO')) {
      if (subcategoria.nombre.includes('Teclado')) {
        prefijo = 'TEC'
      } else if (subcategoria.nombre.includes('Mouse')) {
        prefijo = 'MOU'
      } else {
        prefijo = 'ACC'
      }
    } else {
      // Prefijo genérico: primeras 3 letras de la categoría
      prefijo = nombreCategoria.substring(0, 3)
    }

    // Buscar el último código con ese prefijo
    const ultimoProducto = await prisma.producto.findFirst({
      where: {
        codigo: {
          startsWith: prefijo
        }
      },
      orderBy: {
        codigo: 'desc'
      }
    })

    let numeroSiguiente = 1
    if (ultimoProducto) {
      // Extraer el número del código (ej: LAP001 -> 001)
      const numeroActual = parseInt(ultimoProducto.codigo.replace(prefijo, ''))
      if (!isNaN(numeroActual)) {
        numeroSiguiente = numeroActual + 1
      }
    }

    // Generar código con formato: PREFIJO + número de 3 dígitos
    const codigoGenerado = `${prefijo}${numeroSiguiente.toString().padStart(3, '0')}`

    return NextResponse.json({ 
      success: true,
      codigo: codigoGenerado
    })
  } catch (error) {
    console.error('Error al generar código:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al generar código'
    }, { status: 500 })
  }
}
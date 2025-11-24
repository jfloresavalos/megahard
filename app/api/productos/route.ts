import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

// GET - Obtener todos los productos CON STOCK REAL Y BÚSQUEDA
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sedeId = searchParams.get('sedeId')
    const busqueda = searchParams.get('busqueda') || '' // ✅ NUEVO
    const soloConStock = searchParams.get('soloConStock') === 'true' // ✅ NUEVO

    console.log('📦 Obteniendo productos:', { sedeId, busqueda, soloConStock })

    // ✅ CONSTRUIR FILTROS DE BÚSQUEDA
    const where: any = { activo: true }

    if (busqueda) {
      where.OR = [
        { codigo: { contains: busqueda, mode: 'insensitive' } },
        { nombre: { contains: busqueda, mode: 'insensitive' } }
      ]
    }

    const productos = await prisma.producto.findMany({
      where,
      include: {
        subcategoria: {
          include: {
            categoria: true
          }
        },
        sedes: sedeId ? {
          where: {
            sedeId: sedeId
          },
          include: {
            sede: true
          }
        } : {
          include: {
            sede: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      },
      take: busqueda ? 50 : undefined // ✅ Limitar a 50 cuando hay búsqueda
    })

    // ✅ Transformar productos con stock real
    const productosConStock = productos.map(producto => {
      let stockDisponible = 0

      if (sedeId && producto.sedes.length > 0) {
        // Si hay sede específica, usar ese stock
        stockDisponible = producto.sedes[0].stock
      } else if (producto.sedes.length > 0) {
        // Si no hay sede, sumar todo el stock disponible
        stockDisponible = producto.sedes.reduce((sum, sede) => sum + sede.stock, 0)
      }

      return {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precioCompra: Number(producto.precioCompra),
        precioVenta: Number(producto.precioVenta),
        garantia: producto.garantia,
        stockMin: producto.stockMin,
        imagenes: producto.imagenes,
        subcategoriaId: producto.subcategoriaId,
        activo: producto.activo,
        subcategoria: producto.subcategoria,
        sedes: producto.sedes,
        stockDisponible, // ✅ Stock real
        stock: stockDisponible, // ✅ Alias para compatibilidad con el modal
        stockBajo: stockDisponible <= producto.stockMin
      }
    })
    .filter(p => !soloConStock || p.stockDisponible > 0) // ✅ Filtrar solo con stock si se pidió

    console.log(`✅ ${productosConStock.length} productos obtenidos`)

    return NextResponse.json({ 
      success: true,
      productos: productosConStock
    })
  } catch (error) {
    console.error('Error al obtener productos:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al obtener productos'
    }, { status: 500 })
  }
}

// POST - Crear nuevo producto (SIN CAMBIOS)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      codigo,
      nombre,
      descripcion,
      precioCompra,
      precioVenta,
      garantia,
      stockMin,
      subcategoriaId,
      stockInicial,
      sedeId,
      imagenes
    } = body

    // Validar que el código no exista
    const productoExistente = await prisma.producto.findUnique({
      where: { codigo }
    })

    if (productoExistente) {
      return NextResponse.json({
        success: false,
        error: 'Ya existe un producto con ese código'
      }, { status: 400 })
    }

    // Crear el producto
    const producto = await prisma.producto.create({
      data: {
        codigo,
        nombre,
        descripcion: descripcion || null,
        precioCompra: parseFloat(precioCompra),
        precioVenta: parseFloat(precioVenta),
        garantia: garantia || null,
        stockMin: parseInt(stockMin),
        subcategoriaId,
        imagenes: imagenes || [],
        activo: true
      }
    })

    // Si hay stock inicial, crear el registro en ProductoSede
    if (stockInicial && parseInt(stockInicial) > 0 && sedeId) {
      await prisma.productoSede.create({
        data: {
          productoId: producto.id,
          sedeId: sedeId,
          stock: parseInt(stockInicial)
        }
      })

      // Registrar movimiento de stock inicial
      await prisma.movimientoStock.create({
        data: {
          productoId: producto.id,
          sedeId: sedeId,
          tipo: 'ENTRADA',
          cantidad: parseInt(stockInicial),
          stockAntes: 0,
          stockDespues: parseInt(stockInicial),
          motivo: 'Stock inicial del producto',
          fecha: new Date()
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Producto creado correctamente',
      producto
    })
  } catch (error) {
    console.error('Error al crear producto:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al crear producto'
    }, { status: 500 })
  }
}
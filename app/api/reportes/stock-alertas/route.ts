import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sedeParam = searchParams.get('sede')

    const esAdmin = session.user.rol === 'admin' || session.user.rol === 'supervisor'
    const userSedeId = session.user.sedeId

    // Determinar qué sede consultar
    let whereCondition: any = {}
    
    if (esAdmin && sedeParam && sedeParam !== 'TODAS') {
      // Admin consultando una sede específica
      whereCondition.sedeId = sedeParam
    } else if (!esAdmin && userSedeId) {
      // Usuario regular: solo su sede
      whereCondition.sedeId = userSedeId
    }
    // Si es admin y sedeParam es TODAS o no hay parámetro, consultar todas (sin filtrar por sede)

    // Obtener ProductoSede con stock
    const productosStock = await prisma.productoSede.findMany({
      where: Object.keys(whereCondition).length > 0 ? whereCondition : undefined,
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            stockMin: true,
            subcategoriaId: true,
            subcategoria: {
              select: { nombre: true }
            }
          }
        }
      }
    })

    const productosConAlerta = productosStock.map(ps => {
      const stockMin = ps.producto.stockMin || 5
      const stockMax = 100 // Default, ya que no existe en el schema
      
      let alerta: 'CRITICO' | 'BAJO' | 'NORMAL'
      
      if (ps.stock === 0 || ps.stock < stockMin / 2) {
        alerta = 'CRITICO'
      } else if (ps.stock < stockMin) {
        alerta = 'BAJO'
      } else {
        alerta = 'NORMAL'
      }

      return {
        id: ps.producto.id,
        nombre: ps.producto.nombre,
        codigo: ps.producto.codigo,
        stockActual: ps.stock,
        stockMinimo: stockMin,
        stockMaximo: stockMax,
        categoria: ps.producto.subcategoria?.nombre || 'Sin categoría',
        proveedor: 'N/A', // No existe en el schema actual
        alerta,
        diasPendiente: 0
      }
    })

    // Contar alertas
    const estadisticas = {
      criticos: productosConAlerta.filter(p => p.alerta === 'CRITICO').length,
      bajos: productosConAlerta.filter(p => p.alerta === 'BAJO').length,
      normales: productosConAlerta.filter(p => p.alerta === 'NORMAL').length,
      total: productosConAlerta.length
    }

    return NextResponse.json({
      productos: productosConAlerta.sort((a, b) => {
        // Ordenar por: Críticos primero, luego Bajos, luego Normales
        const orden = { CRITICO: 0, BAJO: 1, NORMAL: 2 }
        return orden[a.alerta] - orden[b.alerta]
      }),
      estadisticas
    })
  } catch (error) {
    console.error('Error en stock-alertas:', error)
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
  }
}

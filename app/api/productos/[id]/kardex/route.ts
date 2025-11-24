import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET: Obtener kardex de un producto
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params
    const productoId = id;
    const { searchParams } = new URL(request.url);
    
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const tipo = searchParams.get('tipo');
    const sedeIdParam = searchParams.get('sedeId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Obtener usuario actual
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id }
    });

    // Determinar qué sede usar para filtrar
    let sedeIdFiltro: string | undefined;
    if (usuario?.rol === 'ADMIN') {
      // Admin puede ver todas las sedes, pero si especifica una, la respeta
      sedeIdFiltro = sedeIdParam || undefined;
    } else {
      // Usuario normal solo ve su sede
      sedeIdFiltro = usuario?.sedeId || undefined;
    }

    // Verificar que el producto existe
    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      include: {
        subcategoria: {
          include: {
            categoria: true
          }
        },
        sedes: {
          include: {
            sede: true
          }
        }
      }
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Calcular stock total
    const stockTotal = producto.sedes.reduce((sum, ps) => sum + ps.stock, 0);

    // Construir filtros
    const where: {
      productoId: string;
      anulado: boolean;
      tipo?: string;
      sedeId?: string;
      fecha?: { gte?: Date; lte?: Date };
    } = {
      productoId,
      anulado: false
    };

    if (tipo) {
      where.tipo = tipo;
    }

    // Usar el sedeIdFiltro que ya fue determinado por rol
    if (sedeIdFiltro) {
      where.sedeId = sedeIdFiltro;
    }

    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) {
        where.fecha.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        where.fecha.lte = new Date(fechaHasta + 'T23:59:59');
      }
    }

    // Obtener total de movimientos
    const totalMovimientos = await prisma.movimientoStock.count({ where });

    // Obtener movimientos ordenados por fecha
    const movimientos = await prisma.movimientoStock.findMany({
      where,
      include: {
        sede: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Calcular estadísticas
    const todosMovimientos = await prisma.movimientoStock.findMany({
      where: {
        productoId,
        anulado: false
      },
      select: {
        tipo: true,
        cantidad: true
      }
    });

    const estadisticas = {
      stockActual: stockTotal,
      precioCompra: Number(producto.precioCompra),
      precioVenta: Number(producto.precioVenta),
      totalIngresos: 0,
      totalSalidas: 0,
      totalAjustesPositivos: 0,
      totalAjustesNegativos: 0,
      totalTraspasosSalida: 0,
      totalTraspasosEntrada: 0,
      totalUsoServicios: 0,
      totalDevoluciones: 0,
      totalMermas: 0,
      cantidadMovimientos: totalMovimientos
    };

    todosMovimientos.forEach(mov => {
      switch (mov.tipo) {
        case 'INGRESO':
          estadisticas.totalIngresos += mov.cantidad;
          break;
        case 'SALIDA':
          estadisticas.totalSalidas += mov.cantidad;
          break;
        case 'AJUSTE_POSITIVO':
          estadisticas.totalAjustesPositivos += mov.cantidad;
          break;
        case 'AJUSTE_NEGATIVO':
          estadisticas.totalAjustesNegativos += mov.cantidad;
          break;
        case 'TRASPASO_SALIDA':
          estadisticas.totalTraspasosSalida += mov.cantidad;
          break;
        case 'TRASPASO_ENTRADA':
          estadisticas.totalTraspasosEntrada += mov.cantidad;
          break;
        case 'USO_SERVICIO':
          estadisticas.totalUsoServicios += mov.cantidad;
          break;
        case 'DEVOLUCION':
          estadisticas.totalDevoluciones += mov.cantidad;
          break;
        case 'MERMA':
          estadisticas.totalMermas += mov.cantidad;
          break;
      }
    });

    // Formatear movimientos para el kardex
    const kardex = movimientos.map(mov => {
      let entradas = 0;
      let salidas = 0;

      if (['INGRESO', 'AJUSTE_POSITIVO', 'TRASPASO_ENTRADA', 'DEVOLUCION'].includes(mov.tipo)) {
        entradas = mov.cantidad;
      } else {
        salidas = mov.cantidad;
      }

      return {
        id: mov.id,
        fecha: mov.fecha,
        tipo: mov.tipo,
        referencia: mov.referencia || '-',
        motivo: mov.motivo || '-',
        entradas,
        salidas,
        saldo: mov.stockDespues,
        sede: mov.sede?.nombre || 'N/A'
      };
    });

    return NextResponse.json({
      success: true,
      producto: {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.subcategoria?.categoria?.nombre || 'Sin categoría',
        stockActual: stockTotal,
        precioCompra: Number(producto.precioCompra),
        precioVenta: Number(producto.precioVenta)
      },
      estadisticas,
      kardex,
      pagination: {
        total: totalMovimientos,
        page,
        limit,
        totalPages: Math.ceil(totalMovimientos / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener kardex:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
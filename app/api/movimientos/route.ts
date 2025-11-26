import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET: Listar movimientos
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const sedeIdParam = searchParams.get('sedeId');
    const productoId = searchParams.get('productoId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Obtener usuario para verificar rol
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id }
    });

    // Determinar qué sede usar para filtrar
    let sedeIdFiltro: string | undefined;
    if (usuario?.rol === 'admin') {
      // Admin puede ver todas las sedes, pero si especifica una, la respeta
      sedeIdFiltro = sedeIdParam || undefined;
    } else {
      // Usuario normal solo ve su sede
      sedeIdFiltro = usuario?.sedeId || undefined;
    }

    // Construir filtros
    const where: {
      tipo?: string;
      sedeId?: string;
      productoId?: string;
      fecha?: { gte?: Date; lte?: Date };
    } = {
      // NO filtrar por anulado - mostrar todos incluyendo anulados
    };

    if (tipo) {
      where.tipo = tipo;
    }

    // Usar el sedeIdFiltro determinado por rol
    if (sedeIdFiltro) {
      where.sedeId = sedeIdFiltro;
    }

    if (productoId) {
      where.productoId = productoId;
    }

    // ✅ Filtro de fecha con zona horaria de Perú (UTC-5)
    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) {
        // Perú está en UTC-5, entonces 00:00:00 en Perú es 05:00:00 UTC
        const fechaInicio = new Date(fechaDesde + 'T05:00:00.000Z');
        where.fecha.gte = fechaInicio;
        console.log('📅 Filtro desde:', fechaDesde, '→', fechaInicio.toISOString());
      }
      if (fechaHasta) {
        // 23:59:59 en Perú es 04:59:59 del día siguiente en UTC
        const fechaFin = new Date(fechaHasta + 'T05:00:00.000Z');
        fechaFin.setDate(fechaFin.getDate() + 1);
        fechaFin.setMilliseconds(-1);
        where.fecha.lte = fechaFin;
        console.log('📅 Filtro hasta:', fechaHasta, '→', fechaFin.toISOString());
      }
    }

    // Contar total
    const total = await prisma.movimientoStock.count({ where });

    // Obtener movimientos
    const movimientos = await prisma.movimientoStock.findMany({
      where,
      select: {
        id: true,
        tipo: true,
        cantidad: true,
        stockAntes: true,
        stockDespues: true,
        motivo: true,
        referencia: true,
        precioCompra: true,
        precioVenta: true,
        fecha: true,
        anulado: true,
        usuarioAnulaId: true,
        fechaAnulacion: true,
        producto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            subcategoria: {
              select: {
                nombre: true,
                categoria: {
                  select: {
                    nombre: true
                  }
                }
              }
            }
          }
        },
        sede: {
          select: {
            id: true,
            nombre: true
          }
        },
        usuario: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        fecha: 'asc'  // Ordenar por fecha ASCENDENTE para calcular saldo acumulado correctamente
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Calcular saldo acumulado para cada movimiento
    const movimientosConSaldo = movimientos.map((mov, index) => {
      // El saldo es el stockDespues del movimiento actual
      return {
        ...mov,
        saldo: mov.stockDespues
      };
    });

    return NextResponse.json({
      success: true,
      movimientos: movimientosConSaldo,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error al listar movimientos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Crear movimiento
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      sedeId,
      tipo,
      lineas,
      motivo,
      referencia,
      observaciones
    } = body;

    // Validaciones básicas
    if (!sedeId) {
      return NextResponse.json({ error: 'Sede es requerida' }, { status: 400 });
    }

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de movimiento es requerido' }, { status: 400 });
    }

    if (!lineas || lineas.length === 0) {
      return NextResponse.json({ error: 'Al menos un producto es requerido' }, { status: 400 });
    }

    // Verificar sede existe
    const sede = await prisma.sede.findUnique({
      where: { id: sedeId }
    });

    if (!sede) {
      return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 });
    }

    // Procesar cada línea del movimiento
    const movimientosCreados: any[] = [];

    for (const linea of lineas) {
      const { productoId, cantidad } = linea;

      if (!productoId || cantidad <= 0) {
        return NextResponse.json({ 
          error: 'Todas las líneas deben tener producto y cantidad mayor a 0' 
        }, { status: 400 });
      }

      // Verificar producto existe
      const producto = await prisma.producto.findUnique({
        where: { id: productoId }
      });

      if (!producto) {
        return NextResponse.json({ error: `Producto ${productoId} no encontrado` }, { status: 404 });
      }

      // Obtener stock actual en ProductoSede
      let productoSede = await prisma.productoSede.findUnique({
        where: {
          productoId_sedeId: {
            productoId,
            sedeId
          }
        }
      });

      // Si no existe ProductoSede, crearlo con stock 0
      if (!productoSede) {
        productoSede = await prisma.productoSede.create({
          data: {
            productoId,
            sedeId,
            stock: 0
          }
        });
      }

      const stockAntes = productoSede.stock;
      let stockDespues = stockAntes;

      // Tipos que SUMAN stock
      if (['INGRESO', 'AJUSTE_POSITIVO', 'TRASPASO_ENTRADA', 'DEVOLUCION'].includes(tipo)) {
        stockDespues = stockAntes + cantidad;
      }
      // Tipos que RESTAN stock
      else if (['AJUSTE_NEGATIVO', 'MERMA', 'TRASPASO_SALIDA'].includes(tipo)) {
        // ✅ VALIDAR que hay stock suficiente antes de permitir la salida
        if (stockAntes < cantidad) {
          return NextResponse.json({
            error: `Stock insuficiente para "${producto.nombre}" en ${sede.nombre}. Stock disponible: ${stockAntes}, solicitado: ${cantidad}`
          }, { status: 400 });
        }
        stockDespues = stockAntes - cantidad;
      }

      // Crear movimiento
      const movimiento = await prisma.movimientoStock.create({
        data: {
          productoId,
          sedeId,
          tipo,
          cantidad,
          stockAntes,
          stockDespues,
          motivo: motivo || null,
          referencia: referencia || null,
          observaciones: observaciones || null,
          usuarioId: session.user.id,
          fecha: new Date()
        },
        include: {
          producto: {
            select: { nombre: true, codigo: true }
          },
          sede: {
            select: { nombre: true }
          }
        }
      });

      // Actualizar stock en ProductoSede
      await prisma.productoSede.update({
        where: {
          productoId_sedeId: {
            productoId,
            sedeId
          }
        },
        data: { stock: stockDespues }
      });

      movimientosCreados.push(movimiento);
    }

    return NextResponse.json({
      success: true,
      message: `${movimientosCreados.length} movimiento(s) registrado(s)`,
      movimientos: movimientosCreados
    });

  } catch (error: any) {
    console.error('❌ Error al crear movimiento:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

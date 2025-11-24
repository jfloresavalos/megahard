import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sedeId = searchParams.get('sedeId'); // 'todas' o ID de sede
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    // Construir filtros base (sin excluir estados aquí, lo haremos en cada query específico)
    const whereServicio: any = {};

    const whereVenta: any = {
      estado: 'COMPLETADA'
    };

    // Filtrar por sede si no es "todas"
    if (sedeId && sedeId !== 'todas') {
      whereServicio.sedeId = sedeId;
      whereVenta.sedeId = sedeId;
    }

    // Filtrar por rango de fechas
    if (fechaDesde && fechaHasta) {
      whereServicio.createdAt = {
        gte: new Date(fechaDesde + 'T00:00:00'),
        lte: new Date(fechaHasta + 'T23:59:59')
      };
      whereVenta.fecha = {
        gte: new Date(fechaDesde + 'T00:00:00'),
        lte: new Date(fechaHasta + 'T23:59:59')
      };
    }

    // 1. SERVICIOS POR ESTADO (sin CANCELADO ni ENTREGADO)
    const serviciosPorEstado = await prisma.servicioTecnico.groupBy({
      by: ['estado'],
      where: {
        ...whereServicio,
        estado: {
          notIn: ['CANCELADO', 'ENTREGADO']
        }
      },
      _count: {
        id: true
      }
    });

    // 2. TOTAL DE SERVICIOS CREADOS EN EL RANGO (excluyendo CANCELADO)
    const totalServicios = await prisma.servicioTecnico.count({
      where: {
        ...whereServicio,
        estado: {
          not: 'CANCELADO'
        }
      }
    });

    // 3. SERVICIOS ENTREGADOS
    const serviciosEntregados = await prisma.servicioTecnico.count({
      where: {
        ...whereServicio,
        estado: 'ENTREGADO'
      }
    });

    // 3.5 INGRESOS TOTALES DE SERVICIOS
    const serviciosData = await prisma.servicioTecnico.aggregate({
      where: {
        ...whereServicio,
        estado: {
          not: 'CANCELADO'
        }
      },
      _sum: {
        total: true
      }
    });

    // 4. TOTAL DE VENTAS (solo independientes, sin servicioId)
    const ventasData = await prisma.venta.aggregate({
      where: {
        ...whereVenta,
        servicioId: null // Solo ventas sin servicio asociado
      },
      _count: {
        id: true
      },
      _sum: {
        total: true
      }
    });

    // 5. COMPARATIVA POR SEDE (solo si sedeId === 'todas')
    let comparativaSedes: Array<{ sede: string; servicios: number; ventas: number; ingresos: number | any }> = [];
    if (sedeId === 'todas') {
      const sedes = await prisma.sede.findMany({
        select: {
          id: true,
          nombre: true
        }
      });

      comparativaSedes = await Promise.all(
        sedes.map(async (sede) => {
          const whereSedeServicio = { ...whereServicio, sedeId: sede.id };
          const whereSedeVenta = { ...whereVenta, sedeId: sede.id };

          const servicios = await prisma.servicioTecnico.count({
            where: whereSedeServicio
          });

          const serviciosIngresos = await prisma.servicioTecnico.aggregate({
            where: {
              ...whereSedeServicio,
              estado: {
                not: 'CANCELADO'
              }
            },
            _sum: { total: true }
          });

          const ventas = await prisma.venta.aggregate({
            where: {
              ...whereSedeVenta,
              servicioId: null // Solo ventas sin servicio asociado
            },
            _count: { id: true },
            _sum: { total: true }
          });

          const ventasIngresos = Number(ventas._sum.total) || 0;
          const serviciosIngresosTotal = Number(serviciosIngresos._sum.total) || 0;

          return {
            sede: sede.nombre,
            servicios,
            ventas: ventas._count.id,
            ingresosVentas: ventasIngresos,
            ingresosServicios: serviciosIngresosTotal,
            ingresos: ventasIngresos + serviciosIngresosTotal
          };
        })
      );
    }

    // 6. SERVICIOS MÁS ANTIGUOS POR ESTADO (para mostrar en tabla)
    const estadosMasAntiguos = await Promise.all(
      serviciosPorEstado.map(async (item) => {
        const masAntiguo = await prisma.servicioTecnico.findFirst({
          where: {
            ...whereServicio,
            estado: item.estado
          },
          orderBy: {
            createdAt: 'asc'
          },
          select: {
            createdAt: true
          }
        });

        return {
          estado: item.estado,
          cantidad: item._count.id,
          masAntiguo: masAntiguo?.createdAt || null
        };
      })
    );

    return NextResponse.json({
      success: true,
      metricas: {
        totalServicios,
        serviciosEntregados,
        totalVentas: ventasData._count.id,
        ingresosVentas: Number(ventasData._sum.total) || 0,
        ingresosServicios: Number(serviciosData._sum.total) || 0,
        serviciosPorEstado: estadosMasAntiguos,
        comparativaSedes
      }
    });

  } catch (error: any) {
    console.error('❌ Error al obtener métricas del dashboard:', error);
    return NextResponse.json(
      { error: 'Error al obtener métricas' },
      { status: 500 }
    );
  }
}

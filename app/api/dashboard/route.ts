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

    // 🔍 DEBUG: Log incoming parameters and session
    console.log('🔍 DEBUG Dashboard API:');
    console.log('  📥 sedeId recibido:', sedeId);
    console.log('  👤 Usuario:', session.user?.username);
    console.log('  🏢 Rol:', session.user?.rol);
    console.log('  📍 SedeId del usuario:', session.user?.sedeId);
    console.log('  📅 Fechas:', { fechaDesde, fechaHasta });

    // Construir filtros base (sin excluir estados aquí, lo haremos en cada query específico)
    const whereServicio: any = {};

    const whereVenta: any = {
      estado: 'COMPLETADA'
    };

    // Filtrar por sede si no es "todas"
    if (sedeId && sedeId !== 'todas') {
      whereServicio.sedeId = sedeId;
      whereVenta.sedeId = sedeId;
      console.log('  ✅ Filtro de sede aplicado:', sedeId);
    } else {
      console.log('  ⚠️  NO se aplicó filtro de sede (sedeId === "todas" o null)');
    }

    console.log('  🔧 whereServicio:', JSON.stringify(whereServicio, null, 2));
    console.log('  🔧 whereVenta:', JSON.stringify(whereVenta, null, 2));

    // Filtrar por rango de fechas con zona horaria de Perú (UTC-5)
    if (fechaDesde && fechaHasta) {
      // 00:00:00 en Perú = 05:00:00 UTC
      const fechaInicio = new Date(fechaDesde + 'T05:00:00.000Z')
      // 23:59:59 en Perú = 04:59:59 del día siguiente en UTC
      const fechaFin = new Date(fechaHasta + 'T05:00:00.000Z')
      fechaFin.setDate(fechaFin.getDate() + 1)
      fechaFin.setMilliseconds(-1)

      whereServicio.createdAt = {
        gte: fechaInicio,
        lte: fechaFin
      };
      whereVenta.fecha = {
        gte: fechaInicio,
        lte: fechaFin
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

    // 🔍 DEBUG: Log query results
    console.log('  📊 RESULTADOS DE QUERIES:');
    console.log('    🔧 Total Servicios:', totalServicios);
    console.log('    ✅ Servicios Entregados:', serviciosEntregados);
    console.log('    💰 Ingresos Servicios:', Number(serviciosData._sum.total) || 0);
    console.log('    🛒 Total Ventas:', ventasData._count.id);
    console.log('    💵 Ingresos Ventas:', Number(ventasData._sum.total) || 0);

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

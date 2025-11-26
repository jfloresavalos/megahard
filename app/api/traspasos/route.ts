import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET: Listar traspasos
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estadoTraspaso = searchParams.get('estadoTraspaso');
    const sedeId = searchParams.get('sedeId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Solo traspasos de salida y entrada (ambos necesarios para agrupar)
    const where: Record<string, unknown> = {
      tipo: {
        in: ['TRASPASO_SALIDA', 'TRASPASO_ENTRADA']
      },
      anulado: false
    };

    if (estadoTraspaso) {
      where.estadoTraspaso = estadoTraspaso;
    }

    // ✅ Filtro de fecha con zona horaria de Perú (UTC-5)
    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) {
        // Perú está en UTC-5, entonces 00:00:00 en Perú es 05:00:00 UTC
        const fechaInicio = new Date(fechaDesde + 'T05:00:00.000Z');
        (where.fecha as any).gte = fechaInicio;
        console.log('📅 Filtro desde:', fechaDesde, '→', fechaInicio.toISOString());
      }
      if (fechaHasta) {
        // 23:59:59 en Perú es 04:59:59 del día siguiente en UTC
        const fechaFin = new Date(fechaHasta + 'T05:00:00.000Z');
        fechaFin.setDate(fechaFin.getDate() + 1);
        fechaFin.setMilliseconds(-1);
        (where.fecha as any).lte = fechaFin;
        console.log('📅 Filtro hasta:', fechaHasta, '→', fechaFin.toISOString());
      }
    }

    // Si se especifica sedeId como parámetro, filtrar por esa
    if (sedeId) {
      where.OR = [
        { sedeOrigenId: sedeId },
        { sedeDestinoId: sedeId }
      ];
    } else {
      // Si no se especifica sedeId, aplicar filtros según el rol del usuario
      const usuario = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        include: { sede: true }
      });

      // Si no es admin, filtrar por sedes del usuario
      if (usuario?.rol !== 'ADMIN' && usuario?.sedeId) {
        where.OR = [
          { sedeOrigenId: usuario.sedeId },
          { sedeDestinoId: usuario.sedeId }
        ];
      }
      // Si es ADMIN sin sedeId específico en parámetros, muestra TODO
    }

    const total = await prisma.movimientoStock.count({ where });

    const traspasos = await prisma.movimientoStock.findMany({
      where,
      select: {
        id: true,
        tipo: true,
        cantidad: true,
        motivo: true,
        referencia: true,
        estadoTraspaso: true,
        fechaEnvio: true,
        fecha: true,
        sedeId: true,
        sedeOrigenId: true,
        sedeDestinoId: true,
        producto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        sedeOrigen: {
          select: {
            id: true,
            nombre: true
          }
        },
        sedeDestino: {
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
        },
        usuarioRecibe: {
          select: {
            id: true,
            nombre: true
          }
        },
        traspasoRelacionado: {
          select: {
            id: true,
            stockDespues: true,
            fechaRecepcion: true,
            sedeOrigenId: true,
            sedeDestinoId: true,
            sedeId: true,
            sedeOrigen: {
              select: {
                id: true,
                nombre: true
              }
            },
            sedeDestino: {
              select: {
                id: true,
                nombre: true
              }
            },
            sede: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
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

    return NextResponse.json({
      success: true,
      traspasos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Error al listar traspasos:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo traspaso
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      productos,  // Ahora es un array: [{ productoId, cantidad }, ...]
      sedeOrigenId,
      sedeDestinoId,
      motivo,
      observaciones
    } = body;

    // Validaciones
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json({ error: 'Debe proporcionar al menos un producto' }, { status: 400 });
    }

    if (!sedeOrigenId) {
      return NextResponse.json({ error: 'Sede origen es requerida' }, { status: 400 });
    }

    if (!sedeDestinoId) {
      return NextResponse.json({ error: 'Sede destino es requerida' }, { status: 400 });
    }

    if (sedeOrigenId === sedeDestinoId) {
      return NextResponse.json(
        { error: 'La sede origen y destino deben ser diferentes' },
        { status: 400 }
      );
    }

    // Verificar sedes existen
    const sedeOrigen = await prisma.sede.findUnique({
      where: { id: sedeOrigenId }
    });

    const sedeDestino = await prisma.sede.findUnique({
      where: { id: sedeDestinoId }
    });

    if (!sedeOrigen || !sedeDestino) {
      return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 });
    }

    // Generar ID único para el lote
    const loteId = `LOTE-${Date.now()}`;

    // Crear traspasos en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const traspasosSalida: any[] = [];
      
      // Procesar cada producto
      for (const item of productos) {
        const { productoId, cantidad } = item;

        if (!productoId || cantidad <= 0) {
          throw new Error('Producto inválido o cantidad menor a 0');
        }

        // Verificar producto
        const producto = await tx.producto.findUnique({
          where: { id: productoId }
        });

        if (!producto) {
          throw new Error(`Producto ${productoId} no encontrado`);
        }

        // Verificar stock en sede origen
        const productoSede = await tx.productoSede.findUnique({
          where: {
            productoId_sedeId: {
              productoId,
              sedeId: sedeOrigenId
            }
          }
        });

        if (!productoSede || productoSede.stock < cantidad) {
          const stockDisponible = productoSede?.stock || 0;
          throw new Error(`${producto.nombre}: Stock insuficiente. Disponible: ${stockDisponible}`);
        }

        const stockAnteriorOrigen = productoSede.stock;
        const stockDespuesOrigen = stockAnteriorOrigen - cantidad;

        // 1. Crear movimiento de SALIDA en origen
        const traspasoSalida = await tx.movimientoStock.create({
          data: {
            productoId,
            sedeId: sedeOrigenId,
            usuarioId: session.user.id,
            tipo: 'TRASPASO_SALIDA',
            cantidad,
            motivo: motivo || `Traspaso a ${sedeDestino.nombre}`,
            referencia: loteId,  // Todos usan el mismo lote
            observaciones,
            stockAntes: stockAnteriorOrigen,
            stockDespues: stockDespuesOrigen,
            sedeOrigenId,
            sedeDestinoId,
            estadoTraspaso: 'PENDIENTE',
            fechaEnvio: new Date(),
            fecha: new Date()
          }
        });

        // Obtener stock en destino
        const productoSedeDestino = await tx.productoSede.findUnique({
          where: {
            productoId_sedeId: {
              productoId,
              sedeId: sedeDestinoId
            }
          }
        });

        const stockAnteriorDestino = productoSedeDestino?.stock || 0;
        const stockDespuesDestino = stockAnteriorDestino + cantidad;

        // 2. Crear movimiento de ENTRADA en destino (pendiente de recibir)
        const traspasoEntrada = await tx.movimientoStock.create({
          data: {
            productoId,
            sedeId: sedeDestinoId,
            usuarioId: session.user.id,
            tipo: 'TRASPASO_ENTRADA',
            cantidad,
            motivo: motivo || `Entrada desde ${sedeOrigen.nombre}`,
            referencia: loteId,  // Mismo lote
            observaciones,
            stockAntes: stockAnteriorDestino,
            stockDespues: stockDespuesDestino,
            sedeOrigenId,
            sedeDestinoId,
            estadoTraspaso: 'PENDIENTE',
            fecha: new Date()
          }
        });

        // 3. Vincular traspasos
        await tx.movimientoStock.update({
          where: { id: traspasoSalida.id },
          data: { traspasoRelacionadoId: traspasoEntrada.id }
        });

        // 4. Actualizar stock en origen
        await tx.productoSede.update({
          where: {
            productoId_sedeId: {
              productoId,
              sedeId: sedeOrigenId
            }
          },
          data: { stock: stockDespuesOrigen }
        });

        // 5. Crear o actualizar stock en destino
        await tx.productoSede.upsert({
          where: {
            productoId_sedeId: {
              productoId,
              sedeId: sedeDestinoId
            }
          },
          create: {
            productoId,
            sedeId: sedeDestinoId,
            stock: stockDespuesDestino
          },
          update: {
            stock: stockDespuesDestino
          }
        });

        traspasosSalida.push(traspasoSalida);
      }

      return traspasosSalida;
    });

    return NextResponse.json({
      success: true,
      loteId,
      traspasos: resultado
    });

  } catch (error: any) {
    console.error('❌ Error al crear traspasos:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 400 }
    );
  }
}


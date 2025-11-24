import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener configuración
export async function GET() {
  try {
    const config = await prisma.configuracionEmpresa.findFirst({
      where: { activo: true }
    })

    return NextResponse.json({
      success: true,
      configuracion: config
    })
  } catch (error) {
    console.error('Error al obtener configuración:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al obtener configuración'
    }, { status: 500 })
  }
}

// POST - Crear o actualizar configuración
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      nombreEmpresa,
      ruc,
      eslogan,
      descripcion,
      web,
      facebook,
      instagram,
      whatsapp,
      emailContacto,
      metodosPago,
      bancos,
      numeroPlin,
      numeroYape,
      notaFooter
    } = body

    // Validaciones
    if (!nombreEmpresa || !ruc) {
      return NextResponse.json({
        success: false,
        error: 'Nombre de empresa y RUC son obligatorios'
      }, { status: 400 })
    }

    // Buscar si ya existe configuración
    const configExistente = await prisma.configuracionEmpresa.findFirst({
      where: { activo: true }
    })

    let configuracion

    if (configExistente) {
      // Actualizar
      configuracion = await prisma.configuracionEmpresa.update({
        where: { id: configExistente.id },
        data: {
          nombreEmpresa,
          ruc,
          eslogan,
          descripcion,
          web,
          facebook,
          instagram,
          whatsapp,
          emailContacto,
          metodosPago: metodosPago || [],
          bancos: bancos || [],
          numeroPlin,
          numeroYape,
          notaFooter
        }
      })
    } else {
      // Crear nueva
      configuracion = await prisma.configuracionEmpresa.create({
        data: {
          nombreEmpresa,
          ruc,
          eslogan,
          descripcion,
          web,
          facebook,
          instagram,
          whatsapp,
          emailContacto,
          metodosPago: metodosPago || [],
          bancos: bancos || [],
          numeroPlin,
          numeroYape,
          notaFooter,
          activo: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      configuracion
    })
  } catch (error) {
    console.error('Error al guardar configuración:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al guardar configuración'
    }, { status: 500 })
  }
}
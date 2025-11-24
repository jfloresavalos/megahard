import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener todos los usuarios
export async function GET() {
  try {
    const usuarios = await prisma.usuario.findMany({
      include: {
        sede: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ 
      success: true,
      usuarios
    })
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al obtener usuarios'
    }, { status: 500 })
  }
}

// POST - Crear nuevo usuario
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, username, password, rol, sedeId } = body

    // Validar campos requeridos
    if (!nombre || !username || !password) {
      return NextResponse.json({ 
        success: false,
        error: 'Nombre, usuario y contraseña son obligatorios'
      }, { status: 400 })
    }

    // Si es usuario normal, la sede es obligatoria
    if (rol === 'usuario' && !sedeId) {
      return NextResponse.json({ 
        success: false,
        error: 'La sede es obligatoria para usuarios normales'
      }, { status: 400 })
    }

    // Verificar que el username no exista
    const usuarioExistente = await prisma.usuario.findFirst({
      where: { username }
    })

    if (usuarioExistente) {
      return NextResponse.json({ 
        success: false,
        error: 'El nombre de usuario ya está en uso'
      }, { status: 400 })
    }

    // Crear el usuario
    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        username,
        password,
        rol: rol || 'usuario',
        sedeId: rol === 'admin' ? null : sedeId,
        activo: true
      },
      include: {
        sede: true
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Usuario creado correctamente',
      usuario
    })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al crear usuario'
    }, { status: 500 })
  }
}
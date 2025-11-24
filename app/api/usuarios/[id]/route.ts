import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Obtener usuario por ID
export async function GET(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params
    
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        sede: true
      }
    })

    if (!usuario) {
      return NextResponse.json({ 
        success: false,
        error: 'Usuario no encontrado'
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      usuario
    })
  } catch (error) {
    console.error('Error al obtener usuario:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Error al obtener usuario'
    }, { status: 500 })
  }
}

// PUT - Actualizar usuario
export async function PUT(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { nombre, username, password, rol, sedeId } = body

    console.log('=== ACTUALIZANDO USUARIO ===')
    console.log('ID recibido:', id)
    console.log('Body recibido:', body)

    // Validar campos requeridos básicos
    if (!nombre || !username) {
      return NextResponse.json({ 
        success: false,
        error: 'Nombre y usuario son obligatorios'
      }, { status: 400 })
    }

    // Si es usuario normal, la sede es obligatoria
    if (rol === 'usuario' && !sedeId) {
      return NextResponse.json({ 
        success: false,
        error: 'La sede es obligatoria para usuarios normales'
      }, { status: 400 })
    }

    // Verificar que el usuario a actualizar existe
    const usuarioActual = await prisma.usuario.findUnique({
      where: { id }
    })

    if (!usuarioActual) {
      return NextResponse.json({ 
        success: false,
        error: 'Usuario no encontrado'
      }, { status: 404 })
    }

    console.log('Usuario encontrado:', usuarioActual.username)

    // Solo verificar username si cambió
    if (username !== usuarioActual.username) {
      console.log('Username cambió, verificando disponibilidad...')
      
      const otroUsuario = await prisma.usuario.findMany({
        where: { 
          username,
          NOT: {
            id
          }
        }
      })

      if (otroUsuario.length > 0) {
        return NextResponse.json({ 
          success: false,
          error: 'El nombre de usuario ya está en uso por otro usuario'
        }, { status: 400 })
      }
    }

    // Preparar datos para actualizar
    const dataToUpdate: any = {
      nombre,
      username,
      rol: rol || 'usuario',
      // Si es admin, sedeId es null; si es usuario, usar el sedeId proporcionado
      sedeId: rol === 'admin' ? null : sedeId
    }

    // Solo actualizar la contraseña si se proporcionó una nueva
    if (password && password.trim() !== '') {
      console.log('Actualizando contraseña también')
      dataToUpdate.password = password
    }

    console.log('Datos a actualizar:', dataToUpdate)

    // Actualizar el usuario
    const usuario = await prisma.usuario.update({
      where: { id },
      data: dataToUpdate,
      include: {
        sede: true
      }
    })

    console.log('✓ Usuario actualizado exitosamente')

    return NextResponse.json({ 
      success: true,
      message: 'Usuario actualizado correctamente',
      usuario
    })
  } catch (error: any) {
    console.error('=== ERROR AL ACTUALIZAR ===')
    console.error(error)
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Error al actualizar usuario'
    }, { status: 500 })
  }
}
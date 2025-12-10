import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getCajaDiaria } from '@/lib/reportes/queries/cajaDiariaQueries'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const fechaParam = searchParams.get('fecha')

    // Crear fecha en zona horaria local, no UTC
    let fecha: Date
    if (fechaParam) {
      const [year, month, day] = fechaParam.split('-').map(Number)
      fecha = new Date(year, month - 1, day)
    } else {
      fecha = new Date()
    }

    let sedeId: string | null | undefined = searchParams.get('sedeId')

    // 🔐 CONTROL DE ACCESO POR ROL
    const { rol, sedeId: sedeUsuario } = session.user

    if (rol === 'admin' || rol === 'supervisor') {
      // Admins y supervisores pueden ver cualquier sede o todas
      if (sedeId === 'TODAS') {
        sedeId = undefined // No filtrar por sede (consolidado)
      }
    } else {
      // Usuarios normales SOLO pueden ver su sede
      sedeId = sedeUsuario // Forzar su sede
    }

    const data = await getCajaDiaria({
      fecha,
      sedeId: sedeId || undefined,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error en reporte de caja diaria:', error)
    return NextResponse.json(
      { error: 'Error al generar reporte' },
      { status: 500 }
    )
  }
}

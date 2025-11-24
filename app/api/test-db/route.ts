import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const usuariosCount = await prisma.usuario.count()
    const sedesCount = await prisma.sede.count()
    
    return NextResponse.json({ 
      success: true,
      message: 'Conexión exitosa a la base de datos',
      data: {
        usuarios: usuariosCount,
        sedes: sedesCount
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      message: 'Error al conectar con la base de datos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
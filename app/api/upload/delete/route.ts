import { NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL no proporcionada'
      }, { status: 400 })
    }

    // Extraer el path del archivo desde la URL
    // Ej: "/uploads/servicios/archivo.png" -> "uploads/servicios/archivo.png"
    const filePath = url.replace(/^\//, '')
    const fullPath = path.join(process.cwd(), 'public', filePath)

    console.log('🗑️ Intentando eliminar:', fullPath)

    try {
      await unlink(fullPath)
      console.log('✅ Archivo eliminado:', fullPath)
      
      return NextResponse.json({
        success: true,
        message: 'Foto eliminada correctamente'
      })
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // El archivo no existe, pero igual retornamos success
        console.log('⚠️ Archivo no encontrado, pero continuamos')
        return NextResponse.json({
          success: true,
          message: 'Foto no encontrada (ya eliminada)'
        })
      }
      throw error
    }
  } catch (error) {
    console.error('❌ Error al eliminar foto:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al eliminar foto'
    }, { status: 500 })
  }
}
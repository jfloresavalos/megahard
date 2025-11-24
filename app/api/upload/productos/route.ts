import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No se recibió ningún archivo'
      }, { status: 400 })
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        error: 'Solo se permiten imágenes'
      }, { status: 400 })
    }

    // Validar tamaño (2MB máximo para productos)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: 'La imagen no debe superar 2MB'
      }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generar nombre único
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop()
    const filename = `producto-${timestamp}-${randomString}.${extension}`

    // Crear directorio si no existe
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'productos')
    await mkdir(uploadDir, { recursive: true })

    // Guardar archivo
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // URL pública
    const url = `/uploads/productos/${filename}`

    return NextResponse.json({
      success: true,
      url,
      filename
    })
  } catch (error) {
    console.error('Error al subir archivo:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al subir archivo'
    }, { status: 500 })
  }
}

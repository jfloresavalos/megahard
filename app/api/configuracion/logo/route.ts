import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se recibió ningún archivo' },
        { status: 400 }
      );
    }

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'El archivo debe ser una imagen' },
        { status: 400 }
      );
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'La imagen no debe superar 5MB' },
        { status: 400 }
      );
    }

    // Crear carpeta si no existe
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `logo-${timestamp}.${extension}`;
    const filepath = path.join(uploadsDir, filename);

    // Guardar archivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // URL pública del logo
    const logoUrl = `/uploads/${filename}`;

    // Actualizar en la base de datos
    const config = await prisma.configuracionEmpresa.findFirst({
      where: { activo: true }
    });

    if (config) {
      await prisma.configuracionEmpresa.update({
        where: { id: config.id },
        data: { logotipo: logoUrl }
      });
    }

    console.log('✅ Logo guardado:', logoUrl);

    return NextResponse.json({
      success: true,
      url: logoUrl,
      message: 'Logo subido correctamente'
    });

  } catch (error) {
    console.error('❌ Error al subir logo:', error);
    return NextResponse.json(
      { success: false, error: 'Error al subir el logo' },
      { status: 500 }
    );
  }
}
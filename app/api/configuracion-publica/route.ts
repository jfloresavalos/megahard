import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const config = await prisma.configuracionEmpresa.findFirst({
      where: { activo: true },
      select: {
        nombreEmpresa: true,
        logotipo: true,
        eslogan: true,
        whatsapp: true,
        emailContacto: true
      }
    });

    if (!config) {
      return NextResponse.json({
        nombreEmpresa: 'MegaHard',
        logotipo: null,
        eslogan: 'Servicio Técnico',
        whatsapp: null,
        emailContacto: null
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

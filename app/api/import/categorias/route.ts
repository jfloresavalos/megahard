import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

interface ImportResult {
  exitosos: number
  errores: Array<{ fila: number; nombre: string; error: string }>
  duplicados?: Array<{ fila: number; nombre: string }>
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.rol || !['admin', 'supervisor'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado. Solo admin y supervisor pueden importar datos' }, { status: 401 })
    }

    const formData = await request.formData()
    const archivo = formData.get('archivo') as File

    if (!archivo) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    const buffer = await archivo.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    const ws = workbook.Sheets[workbook.SheetNames[workbook.SheetNames.length - 1]]
    const data = XLSX.utils.sheet_to_json(ws) as Record<string, any>[]

    const resultado: ImportResult = {
      exitosos: 0,
      errores: [],
      duplicados: []
    }

    // Validar duplicados dentro del mismo Excel
    const nombresEnExcel = new Set<string>()
    const duplicadosEnExcel = new Map<string, number[]>()

    for (let i = 0; i < data.length; i++) {
      const nombre = String(data[i]['Nombre*'] || '').trim()
      if (nombre) {
        if (nombresEnExcel.has(nombre)) {
          if (!duplicadosEnExcel.has(nombre)) {
            duplicadosEnExcel.set(nombre, [])
          }
          duplicadosEnExcel.get(nombre)!.push(i + 2)
        } else {
          nombresEnExcel.add(nombre)
        }
      }
    }

    // Procesar importación
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i]
        const fila = i + 2
        const nombre = String(row['Nombre*'] || '').trim()

        if (!nombre) throw new Error('Nombre es obligatorio')
        if (nombre.length > 50) throw new Error('Nombre no puede exceder 50 caracteres')

        // Saltar si es duplicado en el Excel
        if (duplicadosEnExcel.has(nombre)) {
          if (duplicadosEnExcel.get(nombre)![0] !== fila) {
            continue
          }
        }

        await prisma.categoria.upsert({
          where: { nombre },
          update: {},
          create: { nombre }
        })

        resultado.exitosos++
      } catch (error) {
        resultado.errores.push({
          fila: i + 2,
          nombre: data[i]['Nombre*'] || 'N/A',
          error: error instanceof Error ? error.message : 'Error desconocido'
        })
      }
    }

    // Agregar información de duplicados
    duplicadosEnExcel.forEach((filas, nombre) => {
      resultado.duplicados!.push({
        fila: filas[0],
        nombre
      })
    })

    // Guardar historial
    const usuarioId = session.user.id as string
    await prisma.historialImportacion.create({
      data: {
        usuarioId,
        tipo: 'categorias',
        cantidad: data.length,
        exitosos: resultado.exitosos,
        errores: resultado.errores.length,
        detalleErrores: JSON.stringify({
          archivo: archivo.name,
          duplicados: resultado.duplicados?.length || 0
        })
      }
    })

    return NextResponse.json({
      success: true,
      resultado,
      mensaje: `Importadas ${resultado.exitosos} categorías. Errores: ${resultado.errores.length}${resultado.duplicados?.length ? `. Duplicados ignorados: ${resultado.duplicados.length}` : ''}`
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error al importar categorías' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

interface ImportResult {
  exitosos: number
  errores: Array<{ fila: number; categoria: string; subcategoria: string; error: string }>
  duplicados?: Array<{ fila: number; categoria: string; subcategoria: string }>
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
    const clavesEnExcel = new Set<string>()
    const duplicadosEnExcel = new Map<string, number[]>()

    for (let i = 0; i < data.length; i++) {
      const categoria = String(data[i]['Categoría*'] || '').trim()
      const subcategoria = String(data[i]['Nombre Subcategoría*'] || '').trim()
      const clave = `${categoria}|${subcategoria}`
      
      if (categoria && subcategoria) {
        if (clavesEnExcel.has(clave)) {
          if (!duplicadosEnExcel.has(clave)) {
            duplicadosEnExcel.set(clave, [])
          }
          duplicadosEnExcel.get(clave)!.push(i + 2)
        } else {
          clavesEnExcel.add(clave)
        }
      }
    }

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i]
        const fila = i + 2

        const categoria = String(row['Categoría*'] || '').trim()
        const subcategoria = String(row['Nombre Subcategoría*'] || '').trim()
        const clave = `${categoria}|${subcategoria}`

        if (!categoria) throw new Error('Categoría es obligatoria')
        if (!subcategoria) throw new Error('Nombre Subcategoría es obligatorio')
        // Saltar si es duplicado en el Excel
        if (duplicadosEnExcel.has(clave)) {
          if (duplicadosEnExcel.get(clave)![0] !== fila) {
            continue
          }
        }

        // Auto-crear categoría si no existe
        let catObj = await prisma.categoria.findUnique({
          where: { nombre: categoria }
        })

        if (!catObj) {
          catObj = await prisma.categoria.create({
            data: { nombre: categoria }
          })
        }

        // Crear subcategoría
        await prisma.subcategoria.upsert({
          where: {
            categoriaId_nombre: {
              nombre: subcategoria,
              categoriaId: catObj.id
            }
          },
          update: {},
          create: {
            nombre: subcategoria,
            categoriaId: catObj.id
          }
        })

        resultado.exitosos++
      } catch (error) {
        resultado.errores.push({
          fila: i + 2,
          categoria: data[i]['Categoría*'] || 'N/A',
          subcategoria: data[i]['Nombre Subcategoría*'] || 'N/A',
          error: error instanceof Error ? error.message : 'Error desconocido'
        })
      }
    }

    // Agregar información de duplicados
    duplicadosEnExcel.forEach((filas, clave) => {
      const [categoria, subcategoria] = clave.split('|')
      resultado.duplicados!.push({
        fila: filas[0],
        categoria,
        subcategoria
      })
    })

    // Guardar historial
    const usuarioId = session.user.id as string
    await prisma.historialImportacion.create({
      data: {
        usuarioId,
        tipo: 'subcategorias',
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
      mensaje: `Importadas ${resultado.exitosos} subcategorías. Errores: ${resultado.errores.length}${resultado.duplicados?.length ? `. Duplicados ignorados: ${resultado.duplicados.length}` : ''}`
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error al importar subcategorías' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import * as XLSX from 'xlsx'

interface PreviewResponse {
  filas: Record<string, any>[]
  totalFilas: number
  columnas: string[]
  duplicados?: Array<{ producto: string; filas: number[] }>
  advertencias?: string[]
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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

    // Detectar duplicados (por nombre + categoría + subcategoría)
    const productosVistos = new Map<string, number[]>()
    const duplicados: Array<{ producto: string; filas: number[] }> = []
    const advertencias: string[] = []

    for (let i = 0; i < data.length; i++) {
      const nombre = String(data[i]['Nombre*'] || '').trim()
      const categoria = String(data[i]['Categoría*'] || '').trim()
      const subcategoria = String(data[i]['Subcategoría*'] || '').trim()
      
      if (nombre && categoria && subcategoria) {
        const clave = `${nombre}|${categoria}|${subcategoria}`
        
        if (productosVistos.has(clave)) {
          productosVistos.get(clave)!.push(i + 2) // +2 porque fila 1 es header, +1 para 1-indexed
        } else {
          productosVistos.set(clave, [i + 2])
        }
      }
    }

    // Crear lista de duplicados
    productosVistos.forEach((filas, clave) => {
      if (filas.length > 1) {
        const [nombre, categoria, subcategoria] = clave.split('|')
        duplicados.push({
          producto: `${nombre} (${categoria} > ${subcategoria})`,
          filas
        })
        advertencias.push(`⚠️ Duplicado: "${nombre}" aparece en filas ${filas.join(', ')}`)
      }
    })

    // Obtener las primeras 5 filas y las columnas
    const filas = data.slice(0, 5)
    const columnas = data.length > 0 ? Object.keys(data[0]) : []

    return NextResponse.json({
      success: true,
      filas,
      totalFilas: data.length,
      columnas,
      duplicados: duplicados.length > 0 ? duplicados : undefined,
      advertencias: advertencias.length > 0 ? advertencias : undefined
    } as PreviewResponse)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error al procesar archivo' },
      { status: 500 }
    )
  }
}

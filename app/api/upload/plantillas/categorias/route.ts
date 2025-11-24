import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const wb = XLSX.utils.book_new()

    // Instrucciones
    const instrucciones = [
      ['PLANTILLA DE IMPORTACIÓN DE CATEGORÍAS'],
      [''],
      ['INSTRUCCIONES:'],
      ['1. Cada fila representa una nueva categoría'],
      ['2. El campo Nombre es obligatorio (*)'],
      ['3. Los nombres deben ser únicos'],
      ['4. Máximo 50 caracteres por nombre'],
      [''],
      ['EJEMPLO:'],
      ['Computadoras'],
      ['Periféricos'],
      ['Impresoras']
    ]

    const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones)
    wsInstrucciones['!cols'] = [{ wch: 50 }]
    XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones')

    // Plantilla
    const headers = ['Nombre*']
    const ejemplos = [
      ['Computadoras'],
      ['Periféricos'],
      ['Impresoras'],
      ['Accesorios'],
      ['Software']
    ]

    const plantilla = [headers, ...ejemplos]
    const wsProductos = XLSX.utils.aoa_to_sheet(plantilla)
    wsProductos['!cols'] = [{ wch: 30 }]

    // Header styling
    if (wsProductos['A1']) {
      wsProductos['A1'].s = {
        fill: { fgColor: { rgb: 'FF70AD47' } },
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    }

    XLSX.utils.book_append_sheet(wb, wsProductos, 'Categorías')

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': 'attachment; filename="plantilla-categorias.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error al generar plantilla' },
      { status: 500 }
    )
  }
}

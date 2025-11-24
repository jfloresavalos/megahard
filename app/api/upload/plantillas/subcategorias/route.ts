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
      ['PLANTILLA DE IMPORTACIÓN DE SUBCATEGORÍAS'],
      [''],
      ['INSTRUCCIONES:'],
      ['1. La categoría se crea automáticamente si no existe (¡no necesitas crearla antes!)'],
      ['2. El nombre de subcategoría es obligatorio (*)'],
      ['3. No puede haber subcategorías duplicadas en la misma categoría'],
      ['4. Máximo 50 caracteres por nombre'],
      [''],
      ['EJEMPLO:'],
      ['Categoría: "Electrónica", Subcategoría: "Celulares"'],
      ['Si "Electrónica" no existe, se crea automáticamente'],
      [''],
      ['VENTAJA:'],
      ['Puedes importar subcategorías de nuevas categorías sin crear categorías antes']
    ]

    const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones)
    wsInstrucciones['!cols'] = [{ wch: 50 }]
    XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones')

    // Plantilla
    const headers = ['Categoría*', 'Nombre Subcategoría*']
    const ejemplos = [
      ['Computadoras', 'Laptops'],
      ['Computadoras', 'PCs de Escritorio'],
      ['Computadoras', 'Tablets'],
      ['Periféricos', 'Monitores'],
      ['Periféricos', 'Teclados'],
      ['Periféricos', 'Mouse'],
      ['Impresoras', 'Inyección de Tinta'],
      ['Impresoras', 'Láser']
    ]

    const plantilla = [headers, ...ejemplos]
    const wsProductos = XLSX.utils.aoa_to_sheet(plantilla)
    wsProductos['!cols'] = [{ wch: 25 }, { wch: 30 }]

    // Header styling
    const headerCells = ['A1', 'B1']
    headerCells.forEach(cell => {
      if (wsProductos[cell]) {
        wsProductos[cell].s = {
          fill: { fgColor: { rgb: 'FFFFC000' } },
          font: { bold: true, color: { rgb: 'FF000000' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      }
    })

    XLSX.utils.book_append_sheet(wb, wsProductos, 'Subcategorías')

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': 'attachment; filename="plantilla-subcategorias.xlsx"',
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

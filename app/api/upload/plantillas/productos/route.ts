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

    // Crear workbook
    const wb = XLSX.utils.book_new()

    // Hoja 1: Instrucciones
    const instrucciones = [
      ['PLANTILLA DE IMPORTACIÓN DE PRODUCTOS'],
      [''],
      ['INSTRUCCIONES:'],
      ['1. Completa los datos en la hoja "Productos"'],
      ['2. Los campos marcados con * son obligatorios'],
      ['3. El Código es OPCIONAL - si no lo proporcionas, se genera automáticamente'],
      ['4. Categoría y Subcategoría se crean automáticamente si no existen (¡no necesitas crearlas antes!)'],
      ['5. Los precios deben ser números positivos'],
      ['6. El stock debe ser un número entero positivo'],
      ['7. Opción de Stock: EQUITATIVO (default) o indicar sede específica (ej: "Lima:50, Arequipa:30")'],
      [''],
      ['VALIDACIONES:'],
      ['- Código: OPCIONAL - Si está vacío, se asigna automáticamente (ej: LAP001, COMP002)'],
      ['- Nombre: Máximo 100 caracteres'],
      ['- Categoría: Se crea automáticamente si no existe'],
      ['- Subcategoría: Se crea automáticamente si no existe'],
      ['- Precio Compra: Debe ser > 0'],
      ['- Precio Venta: Debe ser > Precio Compra'],
      ['- Stock Inicial: Puede ser un número o "Sede:Cantidad" (ej: "Lima:50, Arequipa:30")'],
      [''],
      ['OPCIONES DE STOCK:'],
      ['- Número entero (ej: 100): Se distribuye equitativamente entre todas las sedes'],
      ['- Por sede (ej: "Lima:50, Arequipa:30"): Se asigna stock específico a cada sede'],
      [''],
      ['EJEMPLO RÁPIDO:'],
      ['Puedes importar esto SIN preocuparte por categorías:'],
      ['- Código: (vacío), Nombre: "iPhone 15", Categoría: "Electrónica", Subcategoría: "Celulares"'],
      ['- El sistema crea "Electrónica" y "Celulares" automáticamente']
    ]

    const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones)
    wsInstrucciones['!cols'] = [{ wch: 50 }]
    XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones')

    // Hoja 2: Plantilla
    const headers = [
      'Código',
      'Nombre*',
      'Descripción',
      'Categoría*',
      'Subcategoría*',
      'Precio Compra*',
      'Precio Venta*',
      'Stock Inicial*'
    ]

    const ejemplos = [
      ['', 'Dell XPS 13', 'Laptop ultraportátil', 'Computadoras', 'Laptops', 800, 1200, 10],
      ['LAP002', 'HP Pavilion 15', 'Laptop versátil', 'Computadoras', 'Laptops', 500, 750, 15],
      ['', 'Samsung M7 Monitor', 'Monitor 32" 4K', 'Periféricos', 'Monitores', 350, 500, 8]
    ]

    const plantilla = [headers, ...ejemplos]
    const wsProductos = XLSX.utils.aoa_to_sheet(plantilla)

    // Estilos
    wsProductos['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 30 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ]

    // Header styling
    const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1']
    headerCells.forEach(cell => {
      if (wsProductos[cell]) {
        wsProductos[cell].s = {
          fill: { fgColor: { rgb: 'FF4472C4' } },
          font: { bold: true, color: { rgb: 'FFFFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      }
    })

    XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos')

    // Generar archivo
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': 'attachment; filename="plantilla-productos.xlsx"',
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

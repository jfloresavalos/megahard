import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

function generarPrefijo(categoria: string, subcategoria: string): string {
  const nombreCategoria = categoria.toUpperCase()
  
  if (nombreCategoria.includes('COMPUTADORA')) {
    if (subcategoria.includes('Laptop')) {
      return 'LAP'
    } else if (subcategoria.includes('PC')) {
      return 'PC'
    } else {
      return 'COMP'
    }
  } else if (nombreCategoria.includes('IMPRESORA')) {
    return 'IMP'
  } else if (nombreCategoria.includes('ACCESORIO')) {
    if (subcategoria.includes('Teclado')) {
      return 'TEC'
    } else if (subcategoria.includes('Mouse')) {
      return 'MOU'
    } else {
      return 'ACC'
    }
  } else {
    return nombreCategoria.substring(0, 3)
  }
}

interface DistribucionStock {
  [sedeNombre: string]: number
}

function procesarStock(stockInput: string | number, sedes: Array<{ id: string; nombre: string }>): DistribucionStock {
  const distribucion: DistribucionStock = {}

  if (typeof stockInput === 'number') {
    // Distribución equitativa
    const stockPorSede = Math.floor(stockInput / sedes.length)
    sedes.forEach(sede => {
      distribucion[sede.nombre] = stockPorSede
    })
  } else {
    // Parsing de "Sede1:Cantidad1, Sede2:Cantidad2"
    const partes = String(stockInput).split(',')
    partes.forEach(parte => {
      const [nombreSede, cantidad] = parte.split(':').map(s => s.trim())
      const num = parseInt(cantidad)
      if (!isNaN(num) && num >= 0) {
        distribucion[nombreSede] = num
      }
    })
  }

  return distribucion
}

interface ProductoImport {
  codigo: string
  nombre: string
  descripcion?: string
  categoria: string
  subcategoria: string
  precioCompra: number
  precioVenta: number
  stockInicial: number
}

interface ImportResult {
  exitosos: number
  errores: Array<{ fila: number; codigo: string; error: string }>
  duplicados?: Array<{ fila: number; codigo: string }>
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.rol || !['admin', 'supervisor'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado. Solo admin y supervisor pueden importar datos' }, { status: 401 })
    }

    const formData = await request.formData()
    const archivo = formData.get('archivo') as File
    const sedeId = formData.get('sedeId') as string // Nueva opción (puede ser ID de sede o "TODAS")

    if (!archivo) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    if (!sedeId) {
      return NextResponse.json({ error: 'Debe seleccionar una sede' }, { status: 400 })
    }

    // Validar que la sede exista (solo si no es "TODAS")
    if (sedeId !== 'TODAS') {
      const sedeExiste = await prisma.sede.findUnique({
        where: { id: sedeId }
      })

      if (!sedeExiste) {
        return NextResponse.json({ error: 'Sede no válida' }, { status: 400 })
      }
    }

    // Leer archivo
    const buffer = await archivo.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    const ws = workbook.Sheets[workbook.SheetNames[workbook.SheetNames.length - 1]]
    const data = XLSX.utils.sheet_to_json(ws) as Record<string, any>[]

    const resultado: ImportResult = {
      exitosos: 0,
      errores: []
    }

    // Detectar duplicados dentro del Excel (por nombre + categoría + subcategoría)
    const productosVistos = new Set<string>()
    const duplicadosEnArchivo: string[] = []

    for (let i = 0; i < data.length; i++) {
      const nombre = String(data[i]['Nombre*'] || '').trim()
      const categoria = String(data[i]['Categoría*'] || '').trim()
      const subcategoria = String(data[i]['Subcategoría*'] || '').trim()
      
      const clave = `${nombre}|${categoria}|${subcategoria}`
      
      if (productosVistos.has(clave)) {
        duplicadosEnArchivo.push(`Producto "${nombre}" en ${categoria} > ${subcategoria} aparece múltiples veces`)
      }
      productosVistos.add(clave)
    }

    // Procesar cada fila
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i]
        const fila = i + 2 // +1 por header, +1 porque XLSX es 1-indexed

        // Validar campos obligatorios
        let codigo = String(row['Código'] || '').trim()
        const nombre = String(row['Nombre*'] || '').trim()
        const categoria = String(row['Categoría*'] || '').trim()
        const subcategoria = String(row['Subcategoría*'] || '').trim()
        const precioCompra = parseFloat(row['Precio Compra*'])
        const precioVenta = parseFloat(row['Precio Venta*'])
        const stockInputRaw = row['Stock Inicial*']

        if (!nombre) throw new Error('Nombre es obligatorio')
        if (!categoria) throw new Error('Categoría es obligatoria')
        if (!subcategoria) throw new Error('Subcategoría es obligatoria')
        if (isNaN(precioCompra) || precioCompra < 0) throw new Error('Precio Compra inválido (debe ser 0 o mayor)')
        if (isNaN(precioVenta) || precioVenta < 0) throw new Error('Precio Venta inválido (debe ser 0 o mayor)')
        if (precioCompra > 0 && precioVenta > 0 && precioVenta <= precioCompra) throw new Error('Precio Venta debe ser mayor a Precio Compra')
        if (stockInputRaw === undefined || stockInputRaw === null) throw new Error('Stock Inicial es obligatorio')

        // Auto-crear categoría si no existe
        let catObj = await prisma.categoria.findUnique({
          where: { nombre: categoria },
          include: { subcategorias: true }
        })

        if (!catObj) {
          catObj = await prisma.categoria.create({
            data: { nombre: categoria },
            include: { subcategorias: true }
          })
        }

        // Auto-crear subcategoría si no existe
        let subObj = catObj.subcategorias.find(s => s.nombre === subcategoria)
        if (!subObj) {
          subObj = await prisma.subcategoria.create({
            data: {
              nombre: subcategoria,
              categoriaId: catObj.id
            }
          })
        }

        // Verificar si el producto ya existe por nombre + subcategoría
        let productoExistente = await prisma.producto.findFirst({
          where: {
            nombre: nombre,
            subcategoriaId: subObj.id
          }
        })

        let producto
        let codigoFinal = codigo

        if (productoExistente) {
          // Producto ya existe - solo actualizar stock
          producto = productoExistente
          codigoFinal = productoExistente.codigo
        } else {
          // Nuevo producto - generar código si no se proporciona
          if (!codigo) {
            const prefijo = generarPrefijo(catObj.nombre, subObj.nombre)
            const ultimoProducto = await prisma.producto.findFirst({
              where: { codigo: { startsWith: prefijo } },
              orderBy: { codigo: 'desc' }
            })
            
            let numeroSiguiente = 1
            if (ultimoProducto) {
              const numeroActual = parseInt(ultimoProducto.codigo.replace(prefijo, ''))
              if (!isNaN(numeroActual)) {
                numeroSiguiente = numeroActual + 1
              }
            }
            
            codigoFinal = `${prefijo}${numeroSiguiente.toString().padStart(3, '0')}`
          }

          // Crear producto nuevo
          producto = await prisma.producto.create({
            data: {
              codigo: codigoFinal,
              nombre,
              descripcion: row['Descripción'] ? String(row['Descripción']) : '',
              subcategoriaId: subObj.id,
              precioCompra,
              precioVenta
            }
          })
        }

        // Procesar distribución de stock
        const sedes = await prisma.sede.findMany()

        // Si sedeId está especificado (y no es "TODAS"), solo asignar a esa sede
        if (sedeId && sedeId !== 'TODAS') {
          const stockNum = parseInt(String(stockInputRaw))
          if (isNaN(stockNum) || stockNum < 0) throw new Error('Stock debe ser un número válido')
          
          // Verificar si ya existe stock para este producto en esta sede
          const productoSedeExistente = await prisma.productoSede.findUnique({
            where: {
              productoId_sedeId: {
                productoId: producto.id,
                sedeId: sedeId
              }
            }
          })
          
          if (productoSedeExistente) {
            // Si ya existe, no permitir sobrescribir - mostrar error
            throw new Error(`El producto "${nombre}" ya existe en esta sede con stock ${productoSedeExistente.stock}. Use el módulo de Movimientos para agregar más stock.`)
          }
          
          // Crear nuevo registro de stock para esta sede
          await prisma.productoSede.create({
            data: {
              productoId: producto.id,
              sedeId: sedeId,
              stock: stockNum
            }
          })

          // Registrar movimiento de stock inicial
          await prisma.movimientoStock.create({
            data: {
              productoId: producto.id,
              sedeId: sedeId,
              tipo: 'INGRESO',
              cantidad: stockNum,
              stockAntes: 0,
              stockDespues: stockNum,
              motivo: 'Stock inicial (Importación masiva)',
              referencia: `Importación: ${archivo.name}`,
              usuarioId: session.user.id as string,
              fecha: new Date()
            }
          })
        } else {
          // Distribuir entre todas las sedes (comportamiento anterior)
          const distribucion = procesarStock(stockInputRaw, sedes)
          
          for (const sede of sedes) {
            const stock = distribucion[sede.nombre] || 0

            const productoSedeActual = await prisma.productoSede.findUnique({
              where: {
                productoId_sedeId: {
                  productoId: producto.id,
                  sedeId: sede.id
                }
              }
            })

            const stockAnterior = productoSedeActual?.stock || 0

            await prisma.productoSede.upsert({
              where: {
                productoId_sedeId: {
                  productoId: producto.id,
                  sedeId: sede.id
                }
              },
              update: { stock },
              create: {
                productoId: producto.id,
                sedeId: sede.id,
                stock
              }
            })

            // Registrar movimiento solo si hay stock para esta sede
            if (stock > 0) {
              await prisma.movimientoStock.create({
                data: {
                  productoId: producto.id,
                  sedeId: sede.id,
                  tipo: 'INGRESO',
                  cantidad: stock,
                  stockAntes: stockAnterior,
                  stockDespues: stock,
                  motivo: 'Stock inicial (Importación masiva - distribución automática)',
                  referencia: `Importación: ${archivo.name}`,
                  usuarioId: session.user.id as string,
                  fecha: new Date()
                }
              })
            }
          }
        }

        resultado.exitosos++
      } catch (error) {
        resultado.errores.push({
          fila: i + 2,
          codigo: data[i]['Código'] || 'N/A',
          error: error instanceof Error ? error.message : 'Error desconocido'
        })
      }
    }

    // Guardar historial de importación
    const usuarioId = session.user.id as string

    await prisma.historialImportacion.create({
      data: {
        tipo: 'productos',
        cantidad: data.length,
        exitosos: resultado.exitosos,
        errores: resultado.errores.length,
        detalleErrores: JSON.stringify({
          archivo: archivo.name,
          duplicados: resultado.duplicados?.length || 0
        }),
        usuarioId
      }
    })

    return NextResponse.json({
      success: true,
      resultado,
      duplicadosDetectados: duplicadosEnArchivo.length > 0 ? duplicadosEnArchivo : null,
      mensaje: `Importados ${resultado.exitosos} productos. Errores: ${resultado.errores.length}`
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error al importar productos' },
      { status: 500 }
    )
  }
}

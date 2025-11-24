"use client"

import { useState, useEffect } from "react"

interface Producto {
  id: string
  codigo: string
  nombre: string
  stock: number
  precioVenta: number
}

interface ItemReparacion {
  productoId: string
  cantidad: number
  precioUnit: number
}

interface ModalEditarReparacionProps {
  isOpen: boolean
  onClose: () => void
  servicio: {
    id: string
    numeroServicio: string
    diagnostico: string | null
    solucion: string | null
    items?: Array<{
      id: string
      cantidad: number
      precioUnit: number
      subtotal: number
      producto: {
        id: string
        codigo: string
        nombre: string
        descripcion: string | null
      }
    }>
    fotosDespues?: string[]
  }
}

export default function ModalEditarReparacion({ isOpen, onClose, servicio }: ModalEditarReparacionProps) {
  const [loading, setLoading] = useState(false)
  const [diagnostico, setDiagnostico] = useState('')
  const [solucion, setSolucion] = useState('')
  const [items, setItems] = useState<ItemReparacion[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [cantidad, setCantidad] = useState(1)

  // Fotos
  const [fotosExistentes, setFotosExistentes] = useState<string[]>([])
  const [fotosNuevas, setFotosNuevas] = useState<File[]>([])
  const [previsualizacionesNuevas, setPrevisualizacionesNuevas] = useState<string[]>([])
  const [subiendoFotos, setSubiendoFotos] = useState(false)

  useEffect(() => {
    if (isOpen) {
      cargarProductos()
      cargarDatosServicio()
    }
  }, [isOpen])

  const cargarProductos = async () => {
    try {
      const response = await fetch('/api/productos')
      const data = await response.json()
      if (data.success) {
        setProductos(data.productos.filter((p: Producto) => p.stock > 0))
      }
    } catch (error) {
      console.error('Error al cargar productos:', error)
    }
  }

  const cargarDatosServicio = () => {
    setDiagnostico(servicio.diagnostico || '')
    setSolucion(servicio.solucion || '')
    
    // ✅ CORREGIDO: Usar producto.id en lugar de productoId
    if (servicio.items && servicio.items.length > 0) {
      const itemsExistentes = servicio.items.map(item => ({
        productoId: item.producto.id,
        cantidad: item.cantidad,
        precioUnit: Number(item.precioUnit)
      }))
      setItems(itemsExistentes)
    }

    // Cargar fotos existentes
    if (servicio.fotosDespues && servicio.fotosDespues.length > 0) {
      setFotosExistentes(servicio.fotosDespues)
    }
  }

  const productosFiltrados = productos.filter(p =>
    p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const agregarItem = () => {
    if (!productoSeleccionado) {
      alert('Seleccione un producto')
      return
    }

    if (cantidad <= 0 || cantidad > productoSeleccionado.stock) {
      alert(`Cantidad inválida. Stock disponible: ${productoSeleccionado.stock}`)
      return
    }

    const yaExiste = items.find(i => i.productoId === productoSeleccionado.id)
    if (yaExiste) {
      alert('El producto ya está en la lista')
      return
    }

    setItems([...items, {
      productoId: productoSeleccionado.id,
      cantidad,
      precioUnit: productoSeleccionado.precioVenta
    }])

    setProductoSeleccionado(null)
    setCantidad(1)
    setBusqueda('')
  }

  const eliminarItem = (productoId: string) => {
    setItems(items.filter(i => i.productoId !== productoId))
  }

  const actualizarCantidad = (productoId: string, nuevaCantidad: number) => {
    const producto = productos.find(p => p.id === productoId)
    if (!producto) return

    if (nuevaCantidad <= 0 || nuevaCantidad > producto.stock) {
      alert(`Cantidad inválida. Stock disponible: ${producto.stock}`)
      return
    }

    setItems(items.map(item =>
      item.productoId === productoId
        ? { ...item, cantidad: nuevaCantidad }
        : item
    ))
  }

  const calcularSubtotal = (item: ItemReparacion) => {
    return item.cantidad * item.precioUnit
  }

  const calcularTotalRepuestos = () => {
    return items.reduce((sum, item) => sum + calcularSubtotal(item), 0)
  }

  // GESTIÓN DE FOTOS
  const handleSeleccionarFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files || [])
    const totalFotos = fotosExistentes.length + fotosNuevas.length

    if (totalFotos + archivos.length > 5) {
      alert('⚠️ Máximo 5 fotos en total')
      return
    }

    const archivosValidos = archivos.filter(archivo => {
      if (archivo.size > 5 * 1024 * 1024) {
        alert(`⚠️ La foto ${archivo.name} es muy grande. Máximo 5MB.`)
        return false
      }
      return true
    })

    setFotosNuevas([...fotosNuevas, ...archivosValidos])

    archivosValidos.forEach(archivo => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPrevisualizacionesNuevas(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(archivo)
    })
  }

  const eliminarFotoExistente = async (url: string) => {
    if (!confirm('¿Eliminar esta foto?')) return

    try {
      const response = await fetch('/api/upload/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      if (response.ok) {
        setFotosExistentes(fotosExistentes.filter(f => f !== url))
      }
    } catch (error) {
      console.error('Error al eliminar foto:', error)
    }
  }

  const eliminarFotoNueva = (index: number) => {
    setFotosNuevas(fotosNuevas.filter((_, i) => i !== index))
    setPrevisualizacionesNuevas(previsualizacionesNuevas.filter((_, i) => i !== index))
  }

  const subirFotosNuevas = async (): Promise<string[]> => {
    if (fotosNuevas.length === 0) return []

    setSubiendoFotos(true)
    const urlsFotos: string[] = []

    try {
      for (const foto of fotosNuevas) {
        const formData = new FormData()
        formData.append('file', foto)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        const data = await response.json()
        if (data.success) {
          urlsFotos.push(data.url)
        }
      }
      return urlsFotos
    } catch (error) {
      console.error('Error al subir fotos:', error)
      return []
    } finally {
      setSubiendoFotos(false)
    }
  }

  const handleGuardar = async () => {
  if (!diagnostico.trim()) {
    alert('⚠️ El diagnóstico es obligatorio')
    return
  }

  if (!solucion.trim()) {
    alert('⚠️ La solución es obligatoria')
    return
  }

  setLoading(true)

  try {
    // Subir fotos nuevas
    let urlsFotosNuevas: string[] = []
    if (fotosNuevas.length > 0) {
      urlsFotosNuevas = await subirFotosNuevas()
    }

    const todasLasFotos = [...fotosExistentes, ...urlsFotosNuevas]

    // ✅ Transformar items al formato esperado por el endpoint
    const repuestosActualizados = items.map(item => {
      const producto = productos.find(p => p.id === item.productoId)
      return {
        productoId: item.productoId,
        productoNombre: producto?.nombre || 'Producto',
        cantidad: item.cantidad,
        precioUnit: item.precioUnit,
        subtotal: item.cantidad * item.precioUnit
      }
    })

    const response = await fetch(`/api/servicios/${servicio.id}/editar-reparacion`, {
      method: 'POST',  // ✅ El endpoint usa POST, no PUT
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diagnostico,
        solucion,
        repuestosActualizados,  // ✅ Usar el formato correcto
        fotosDespues: todasLasFotos
         })
    })

    const data = await response.json()

    if (data.success) {
      alert('✅ Reparación actualizada correctamente')
      onClose()
    } else {
      alert('❌ Error: ' + (data.error || 'Error desconocido'))
    }
  } catch (error) {
    console.error('Error:', error)
    alert('❌ Error al actualizar la reparación')
  } finally {
    setLoading(false)
  }
}

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 10
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
            ✏️ Editar Reparación - {servicio.numeroServicio}
          </h2>
        </div>

        {/* Contenido */}
        <div style={{ padding: '1.5rem' }}>
          {/* Diagnóstico */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
              Diagnóstico Técnico *
            </label>
            <textarea
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              rows={4}
              placeholder="Descripción del diagnóstico..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Solución */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
              Solución Aplicada *
            </label>
            <textarea
              value={solucion}
              onChange={(e) => setSolucion(e.target.value)}
              rows={4}
              placeholder="Descripción de la solución..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Repuestos */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
              Repuestos Utilizados
            </label>

            {/* Buscador de productos */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto..."
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Resultados de búsqueda */}
            {busqueda && (
              <div style={{
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                maxHeight: '200px',
                overflow: 'auto',
                marginBottom: '1rem'
              }}>
                {productosFiltrados.map(producto => (
                  <div
                    key={producto.id}
                    onClick={() => {
                      setProductoSeleccionado(producto)
                      setBusqueda('')
                    }}
                    style={{
                      padding: '0.75rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      fontSize: '0.875rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <div style={{ fontWeight: '600' }}>{producto.codigo} - {producto.nombre}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      Stock: {producto.stock} | Precio: S/ {producto.precioVenta.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Producto seleccionado */}
            {productoSeleccionado && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#dbeafe',
                borderRadius: '6px',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                      {productoSeleccionado.codigo} - {productoSeleccionado.nombre}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      Stock: {productoSeleccionado.stock}
                    </div>
                  </div>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    min="1"
                    max={productoSeleccionado.stock}
                    style={{
                      width: '80px',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={agregarItem}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Agregar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de items */}
            {items.length > 0 && (
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                {items.map((item, index) => {
                  const producto = productos.find(p => p.id === item.productoId)
                  return (
                    <div
                      key={item.productoId}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto auto',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem',
                        borderBottom: index < items.length - 1 ? '1px solid #e5e7eb' : 'none',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                      }}
                    >
                      <div style={{ fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: '600' }}>
                          {producto?.codigo} - {producto?.nombre}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          S/ {Number(item.precioUnit || 0).toFixed(2)} c/u
                        </div>
                      </div>
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) => actualizarCantidad(item.productoId, parseInt(e.target.value) || 1)}
                        min="1"
                        max={producto?.stock || 999}
                        style={{
                          width: '60px',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          textAlign: 'center'
                        }}
                      />
                      <div style={{ fontWeight: '600', color: '#10b981', fontSize: '0.875rem' }}>
                        S/ {calcularSubtotal(item).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => eliminarItem(item.productoId)}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  backgroundColor: '#f0fdf4',
                  fontWeight: '700',
                  fontSize: '1rem'
                }}>
                  <span>TOTAL REPUESTOS:</span>
                  <span style={{ color: '#10b981' }}>S/ {calcularTotalRepuestos().toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Fotos */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
              Fotos del Resultado ({fotosExistentes.length + fotosNuevas.length}/5)
            </label>

            {/* Fotos existentes */}
            {fotosExistentes.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Fotos actuales:</div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '0.5rem'
                }}>
                  {fotosExistentes.map((foto, index) => (
                    <div key={index} style={{ position: 'relative', paddingTop: '100%', backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden', border: '2px solid #10b981' }}>
                      <img src={foto} alt={`Foto ${index + 1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => eliminarFotoExistente(foto)}
                        style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', padding: '0.25rem 0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fotos nuevas */}
            {fotosNuevas.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Fotos nuevas:</div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '0.5rem'
                }}>
                  {previsualizacionesNuevas.map((preview, index) => (
                    <div key={index} style={{ position: 'relative', paddingTop: '100%', backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden', border: '2px solid #3b82f6' }}>
                      <img src={preview} alt={`Nueva ${index + 1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => eliminarFotoNueva(index)}
                        style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', padding: '0.25rem 0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: (fotosExistentes.length + fotosNuevas.length) >= 5 ? '#9ca3af' : '#3b82f6',
              color: 'white',
              borderRadius: '6px',
              cursor: (fotosExistentes.length + fotosNuevas.length) >= 5 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem'
            }}>
              📷 Agregar fotos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleSeleccionarFotos}
                disabled={(fotosExistentes.length + fotosNuevas.length) >= 5}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '2px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'white'
        }}>
          <button
            onClick={onClose}
            disabled={loading || subiendoFotos}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading || subiendoFotos ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              opacity: loading || subiendoFotos ? 0.5 : 1
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading || subiendoFotos}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: loading || subiendoFotos ? '#9ca3af' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading || subiendoFotos ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600'
            }}
          >
            {subiendoFotos ? '📸 Subiendo...' : loading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
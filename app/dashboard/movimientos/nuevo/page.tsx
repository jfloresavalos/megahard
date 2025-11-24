"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

interface Producto {
  id: string
  codigo: string
  nombre: string
  stock: number
  precioCompra: number
  precioVenta: number
}

interface Sede {
  id: string
  nombre: string
}

interface LineaMovimiento {
  id: string
  productoId: string
  producto?: Producto
  cantidad: number
}

export default function NuevoMovimientoPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const [formData, setFormData] = useState({
    sedeId: '',
    tipo: '',
    motivo: '',
    referencia: '',
    observaciones: ''
  })

  const [lineas, setLineas] = useState<LineaMovimiento[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [usuarioSedeId, setUsuarioSedeId] = useState<string | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [session])

  // ✅ Cargar productos cuando se selecciona una sede
  useEffect(() => {
    if (formData.sedeId) {
      cargarProductosPorSede(formData.sedeId)
    } else {
      setProductos([])
    }
  }, [formData.sedeId])

  const cargarDatos = async () => {
    try {
      setLoading(true)

      const resSession = await fetch('/api/auth/session')
      const sessionData = await resSession.json()

      if (sessionData?.user) {
        setEsAdmin(sessionData.user.rol === 'ADMIN')
        const resUsuario = await fetch(`/api/usuarios/${sessionData.user.id}`)
        const usuarioData = await resUsuario.json()
        if (usuarioData.success && usuarioData.usuario.sedeId) {
          setUsuarioSedeId(usuarioData.usuario.sedeId)
          setFormData(prev => ({ ...prev, sedeId: usuarioData.usuario.sedeId }))
        }
      }

      const resSedes = await fetch('/api/sedes')
      const dataSedes = await resSedes.json()
      if (dataSedes.success) {
        const sedesData = dataSedes.sedes || []
        setSedes(sedesData)
        // Pre-seleccionar sede si el usuario tiene una
        if (!esAdmin && usuarioSedeId && sedesData.length > 0) {
          setFormData(prev => ({ ...prev, sedeId: usuarioSedeId }))
        }
      }

    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Función para cargar productos filtrados por sede
  const cargarProductosPorSede = async (sedeId: string) => {
    try {
      const resProductos = await fetch(`/api/productos?sedeId=${sedeId}`)
      const dataProductos = await resProductos.json()
      if (dataProductos.success) {
        setProductos(dataProductos.productos || [])
      }
    } catch (error) {
      console.error('Error al cargar productos:', error)
    }
  }

  const agregarLinea = (producto: Producto) => {
    const nuevaLinea: LineaMovimiento = {
      id: Math.random().toString(36).substr(2, 9),
      productoId: producto.id,
      producto,
      cantidad: 1
    }
    setLineas([...lineas, nuevaLinea])
    setBusquedaProducto('')
  }

  const eliminarLinea = (id: string) => {
    setLineas(lineas.filter(l => l.id !== id))
  }

  const actualizarLinea = (id: string, cantidad: number) => {
    if (cantidad < 1) return
    setLineas(lineas.map(l => 
      l.id === id ? { ...l, cantidad } : l
    ))
  }

  const productosFiltrados = productos
    .filter(p =>
      p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busquedaProducto.toLowerCase())
    )
    .filter(p => !lineas.some(l => l.productoId === p.id))
    .filter(p => {
      // ✅ Para tipos que RESTAN stock (AJUSTE_NEGATIVO, MERMA, etc.)
      const tiposQueRestanStock = ['AJUSTE_NEGATIVO', 'MERMA', 'TRASPASO_SALIDA']
      if (tiposQueRestanStock.includes(formData.tipo)) {
        // Admin: mostrar productos pero advertir si no tienen stock
        // Usuario: solo mostrar productos con stock > 0
        if (!esAdmin) {
          return (p.stock || 0) > 0
        }
      }
      // Para tipos que SUMAN stock (INGRESO, AJUSTE_POSITIVO, etc.) mostrar todos
      return true
    })

  const tiposMovimiento = [
    { value: 'INGRESO', label: '📥 Ingreso (Compra)', descripcion: 'Aumenta stock por compra de mercadería' },
    { value: 'AJUSTE_POSITIVO', label: '➕ Ajuste Positivo', descripcion: 'Corrección que aumenta stock' },
    { value: 'AJUSTE_NEGATIVO', label: '➖ Ajuste Negativo', descripcion: 'Corrección que disminuye stock' },
    { value: 'MERMA', label: '⚠️ Merma', descripcion: 'Pérdida, robo o daño de producto' },
    { value: 'DEVOLUCION', label: '🔄 Devolución', descripcion: 'Cliente devuelve producto' }
  ]

  const validarFormulario = () => {
    if (!formData.sedeId) {
      alert('❌ Selecciona una sede')
      return false
    }
    if (!formData.tipo) {
      alert('❌ Selecciona el tipo de movimiento')
      return false
    }
    if (lineas.length === 0) {
      alert('❌ Agrega al menos un producto')
      return false
    }
    if (lineas.some(l => l.cantidad <= 0)) {
      alert('❌ Todas las cantidades deben ser mayores a 0')
      return false
    }
    if (['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'MERMA'].includes(formData.tipo) && !formData.motivo) {
      alert('❌ El motivo es obligatorio para este tipo de movimiento')
      return false
    }
    return true
  }

  const guardarMovimiento = async () => {
    if (!validarFormulario()) return

    try {
      setGuardando(true)

      const response = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sedeId: formData.sedeId,
          tipo: formData.tipo,
          lineas: lineas.map(l => ({
            productoId: l.productoId,
            cantidad: l.cantidad
          })),
          motivo: formData.motivo || null,
          referencia: formData.referencia || null,
          observaciones: formData.observaciones || null
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('✅ Movimiento registrado correctamente')
        router.push('/dashboard/movimientos')
      } else {
        alert(`❌ ${data.error}`)
      }

    } catch (error) {
      console.error('Error al guardar:', error)
      alert('❌ Error al registrar movimiento')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
        ⏳ Cargando...
      </div>
    )
  }

  return (
    <div style={{ 
      maxWidth: '1000px', 
      margin: '0 auto', 
      padding: isMobile ? '0.5rem' : '1rem' 
    }}>
      {/* HEADER */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push('/dashboard/movimientos')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            marginBottom: '1rem'
          }}
        >
          ← Volver
        </button>

        <h1 style={{
          fontSize: isMobile ? '1.5rem' : '2rem',
          fontWeight: 'bold',
          margin: 0
        }}>
          📊 Nuevo Movimiento de Inventario
        </h1>
      </div>

      {/* FORMULARIO */}
      <div style={{
        backgroundColor: 'white',
        padding: isMobile ? '1rem' : '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        {/* PASO 1: SEDE Y TIPO */}
        <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #e5e7eb' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            📍 Paso 1: Sede y Tipo de Movimiento
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Sede * {!esAdmin && usuarioSedeId && '(Tu sede)'}
              </label>
              
              {esAdmin ? (
                <select
                  value={formData.sedeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, sedeId: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                >
                  <option value="">Seleccionar sede...</option>
                  {sedes.map(sede => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              ) : usuarioSedeId ? (
                <div style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#f3f4f6',
                  fontWeight: '500'
                }}>
                  {sedes.find(s => s.id === usuarioSedeId)?.nombre || 'Cargando...'}
                </div>
              ) : (
                <select
                  value={formData.sedeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, sedeId: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                >
                  <option value="">Seleccionar sede...</option>
                  {sedes.map(sede => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Tipo de Movimiento *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              >
                <option value="">Seleccionar tipo...</option>
                {tiposMovimiento.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </div>
          </div>

          {formData.tipo && (
            <>
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                backgroundColor: '#dbeafe',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#1e40af'
              }}>
                ℹ️ {tiposMovimiento.find(t => t.value === formData.tipo)?.descripcion}
              </div>

              {/* ✅ Advertencia sobre stock para movimientos de salida */}
              {['AJUSTE_NEGATIVO', 'MERMA', 'TRASPASO_SALIDA'].includes(formData.tipo) && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: esAdmin ? '#fef2f2' : '#fef3c7',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: esAdmin ? '#991b1b' : '#92400e',
                  border: esAdmin ? '1px solid #fca5a5' : '1px solid #fcd34d'
                }}>
                  {esAdmin ? (
                    <>⚠️ <strong>Administrador:</strong> Podrás ver productos sin stock, pero el sistema validará disponibilidad al guardar.</>
                  ) : (
                    <>🔒 <strong>Usuario:</strong> Solo verás productos con stock disponible en tu sede.</>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* PASO 2: AGREGAR PRODUCTOS */}
        <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #e5e7eb' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            📦 Paso 2: Agregar Productos
          </h2>

          {/* ✅ Advertencia si no ha seleccionado sede o tipo */}
          {(!formData.sedeId || !formData.tipo) && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#92400e',
              border: '1px solid #fcd34d',
              marginBottom: '1rem'
            }}>
              ⚠️ Primero debes seleccionar la <strong>Sede</strong> y el <strong>Tipo de Movimiento</strong> en el Paso 1
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              placeholder={!formData.sedeId || !formData.tipo ? 'Primero selecciona sede y tipo...' : 'Buscar producto por código o nombre...'}
              disabled={!formData.sedeId || !formData.tipo}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #3b82f6',
                borderRadius: '6px',
                fontSize: '1rem',
                backgroundColor: (!formData.sedeId || !formData.tipo) ? '#f3f4f6' : 'white',
                cursor: (!formData.sedeId || !formData.tipo) ? 'not-allowed' : 'text'
              }}
            />
            
            {busquedaProducto && (
              <div style={{
                maxHeight: '250px',
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                marginTop: '0.5rem'
              }}>
                {productosFiltrados.length === 0 ? (
                  <div style={{ padding: '1rem', color: '#6b7280', textAlign: 'center' }}>
                    No se encontraron productos disponibles
                  </div>
                ) : (
                  productosFiltrados.slice(0, 10).map(producto => {
                    const tiposQueRestanStock = ['AJUSTE_NEGATIVO', 'MERMA', 'TRASPASO_SALIDA']
                    const esMovimientoSalida = tiposQueRestanStock.includes(formData.tipo)
                    const sinStock = (producto.stock || 0) === 0
                    const stockInsuficiente = esMovimientoSalida && sinStock

                    return (
                      <div
                        key={producto.id}
                        onClick={() => agregarLinea(producto)}
                        style={{
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid #e5e7eb',
                          cursor: stockInsuficiente && !esAdmin ? 'not-allowed' : 'pointer',
                          backgroundColor: stockInsuficiente && esAdmin ? '#fef2f2' : 'white',
                          opacity: stockInsuficiente && !esAdmin ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!(stockInsuficiente && !esAdmin)) {
                            e.currentTarget.style.backgroundColor = stockInsuficiente && esAdmin ? '#fee2e2' : '#f3f4f6'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!(stockInsuficiente && !esAdmin)) {
                            e.currentTarget.style.backgroundColor = stockInsuficiente && esAdmin ? '#fef2f2' : 'white'
                          }
                        }}
                      >
                        <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {producto.codigo} - {producto.nombre}
                          {stockInsuficiente && esAdmin && (
                            <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold' }}>⚠️ SIN STOCK</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: stockInsuficiente ? '#ef4444' : '#6b7280', fontWeight: stockInsuficiente ? '600' : 'normal' }}>
                          Stock: {producto.stock || 0} | P.Venta: S/ {Number(producto.precioVenta).toFixed(2)}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* LISTA DE PRODUCTOS AGREGADOS */}
          <div>
            <h3 style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#374151' }}>
              Productos en el movimiento ({lineas.length}):
            </h3>
            {lineas.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '2px dashed #d1d5db',
                color: '#6b7280'
              }}>
                📦 Busca y agrega productos arriba
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '0.75rem'
              }}>
                {lineas.map(linea => (
                  <div
                    key={linea.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: isMobile ? 'wrap' : 'nowrap',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontWeight: '600', color: '#111827' }}>
                        {linea.producto?.codigo} - {linea.producto?.nombre}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Stock actual: {linea.producto?.stock}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Cantidad:</label>
                      <input
                        type="number"
                        value={linea.cantidad}
                        onChange={(e) => actualizarLinea(linea.id, parseInt(e.target.value) || 1)}
                        min="1"
                        style={{
                          width: '80px',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '0.95rem',
                          textAlign: 'center'
                        }}
                      />
                    </div>

                    <button
                      onClick={() => eliminarLinea(linea.id)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      ✕ Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PASO 3: INFORMACIÓN ADICIONAL */}
        <div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            📝 Paso 3: Información Adicional
          </h2>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Motivo {['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'MERMA'].includes(formData.tipo) ? '*' : ''}
              </label>
              <input
                type="text"
                value={formData.motivo}
                onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Razón del movimiento..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Referencia
              </label>
              <input
                type="text"
                value={formData.referencia}
                onChange={(e) => setFormData(prev => ({ ...prev, referencia: e.target.value }))}
                placeholder="Número de factura, orden de compra, etc."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                rows={3}
                placeholder="Notas adicionales..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </div>

        {/* BOTONES */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end',
          paddingTop: '2rem',
          marginTop: '2rem',
          borderTop: '2px solid #e5e7eb'
        }}>
          <button
            onClick={() => router.push('/dashboard/movimientos')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#d1d5db',
              color: '#1f2937',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={guardarMovimiento}
            disabled={guardando || lineas.length === 0}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: lineas.length > 0 ? '#10b981' : '#d1d5db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: lineas.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              fontSize: '1rem'
            }}
          >
            {guardando ? '⏳ Guardando...' : '✅ Guardar Movimiento'}
          </button>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

interface ProductoEnTraspaso {
  id: string
  codigo: string
  nombre: string
  cantidad: number
  stockDisponible: number
}

export default function NuevoTraspasoPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const [productosTraspaso, setProductosTraspaso] = useState<ProductoEnTraspaso[]>([])
  const [productos, setProductos] = useState<Array<{ id: string; codigo: string; nombre: string }>>([])
  const [sedes, setSedes] = useState<Array<{ id: string; nombre: string }>>([])
  
  const [sedeOrigenId, setSedeOrigenId] = useState('')
  const [sedeDestinoId, setSedeDestinoId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [usuarioSedeId, setUsuarioSedeId] = useState<string | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  
  const [mostrarModalProducto, setMostrarModalProducto] = useState(false)
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [productosConStock, setProductosConStock] = useState<Array<{ id: string; codigo: string; nombre: string; stock: number }>>([])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [session])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      // Obtener datos del usuario actual
      const resSession = await fetch('/api/auth/session')
      const sessionData = await resSession.json()
      
      if (sessionData?.user) {
        setEsAdmin(sessionData.user.rol === 'admin')
        // Obtener información completa del usuario
        const resUsuario = await fetch(`/api/usuarios/${sessionData.user.id}`)
        const usuarioData = await resUsuario.json()
        if (usuarioData.success && usuarioData.usuario.sedeId) {
          setUsuarioSedeId(usuarioData.usuario.sedeId)
          setSedeOrigenId(usuarioData.usuario.sedeId)
        }
      }
      
      const resProductos = await fetch('/api/productos')
      const dataProductos = await resProductos.json()
      if (dataProductos.success) {
        setProductos(dataProductos.productos || [])
      }

      const resSedes = await fetch('/api/sedes')
      const dataSedes = await resSedes.json()
      if (dataSedes.success) {
        setSedes(dataSedes.sedes || [])
      }

    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar productos con stock cuando se abre el modal
  const abrirModalProducto = async () => {
    if (!sedeOrigenId) {
      alert('❌ Selecciona la sede origen primero')
      return
    }

    try {
      // Obtener productos con stock de la sede específica
      const params = new URLSearchParams()
      params.append('sedeId', sedeOrigenId)
      
      const response = await fetch(`/api/productos?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setProductosConStock(data.productos || [])
      }
    } catch (error) {
      console.error('Error al cargar productos:', error)
    }
    
    setMostrarModalProducto(true)
  }

  const productosFiltrados = productosConStock.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
    p.codigo.toLowerCase().includes(busquedaProducto.toLowerCase())
  )

  const agregarProducto = (producto: { id: string; codigo: string; nombre: string; stock: number }) => {
    // Verificar si ya existe
    if (productosTraspaso.find(p => p.id === producto.id)) {
      alert('⚠️ Este producto ya está en el traspaso')
      return
    }

    // Agregar con cantidad 1 por defecto
    setProductosTraspaso([...productosTraspaso, {
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      cantidad: 1,
      stockDisponible: producto.stock
    }])

    setBusquedaProducto('')
  }

  const actualizarCantidad = (productoId: string, cantidad: number) => {
    setProductosTraspaso(productosTraspaso.map(p =>
      p.id === productoId 
        ? { ...p, cantidad: Math.max(1, Math.min(cantidad, p.stockDisponible)) }
        : p
    ))
  }

  const eliminarProducto = (productoId: string) => {
    setProductosTraspaso(productosTraspaso.filter(p => p.id !== productoId))
  }

  const validarFormulario = () => {
    if (productosTraspaso.length === 0) {
      alert('❌ Agrega al menos un producto')
      return false
    }
    if (!sedeOrigenId) {
      alert('❌ Selecciona la sede de origen')
      return false
    }
    if (!sedeDestinoId) {
      alert('❌ Selecciona la sede de destino')
      return false
    }
    if (sedeOrigenId === sedeDestinoId) {
      alert('❌ La sede origen y destino deben ser diferentes')
      return false
    }
    return true
  }

  const guardarTraspasos = async () => {
    if (!validarFormulario()) return

    try {
      setGuardando(true)

      // Crear un ÚNICO traspaso con todos los productos
      const response = await fetch('/api/traspasos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productos: productosTraspaso.map(p => ({
            productoId: p.id,
            cantidad: p.cantidad
          })),
          sedeOrigenId: sedeOrigenId,
          sedeDestinoId: sedeDestinoId,
          motivo: motivo || null,
          observaciones: observaciones || null
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Traspaso de ${productosTraspaso.length} producto(s) creado correctamente. Pendiente de recepción.`)
        router.push('/dashboard/traspasos')
      } else {
        alert(`❌ Error: ${data.error}`)
      }

    } catch (error) {
      console.error('Error al guardar:', error)
      alert('❌ Error al crear traspaso')
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
          onClick={() => router.push('/dashboard/traspasos')}
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
          🔄 Nuevo Traspaso entre Sedes
        </h1>
      </div>

      {/* FORMULARIO */}
      <div style={{
        backgroundColor: 'white',
        padding: isMobile ? '1rem' : '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        {/* 1. SEDES */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            📍 1. Sedes Origen y Destino
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr',
            gap: '1rem',
            alignItems: 'end'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Sede Origen * {!esAdmin && usuarioSedeId && '(Tu sede)'}
              </label>
              
              {esAdmin ? (
                <select
                  value={sedeOrigenId}
                  onChange={(e) => setSedeOrigenId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                >
                  <option value="">Seleccionar origen...</option>
                  {sedes.map(sede => (
                    <option 
                      key={sede.id} 
                      value={sede.id}
                      disabled={sede.id === sedeDestinoId}
                    >
                      {sede.nombre}
                    </option>
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
                  value={sedeOrigenId}
                  onChange={(e) => setSedeOrigenId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                >
                  <option value="">Seleccionar origen...</option>
                  {sedes.map(sede => (
                    <option 
                      key={sede.id} 
                      value={sede.id}
                      disabled={sede.id === sedeDestinoId}
                    >
                      {sede.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ 
              textAlign: 'center', 
              fontSize: '2rem',
              display: isMobile ? 'none' : 'block'
            }}>
              ➡️
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Sede Destino *
              </label>
              <select
                value={sedeDestinoId}
                onChange={(e) => setSedeDestinoId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              >
                <option value="">Seleccionar destino...</option>
                {sedes.map(sede => (
                  <option 
                    key={sede.id} 
                    value={sede.id}
                    disabled={sede.id === sedeOrigenId}
                  >
                    {sede.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {sedeOrigenId && sedeDestinoId && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#ddd6fe',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.95rem', color: '#5b21b6', fontWeight: '600' }}>
                📍 {sedes.find(s => s.id === sedeOrigenId)?.nombre}
                <span style={{ margin: '0 0.5rem' }}>➡️</span>
                📍 {sedes.find(s => s.id === sedeDestinoId)?.nombre}
              </div>
            </div>
          )}
        </div>

        {/* 2. PRODUCTOS */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            📦 2. Productos a Traspasar
          </h2>

          <button
            onClick={abrirModalProducto}
            disabled={!sedeOrigenId}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: sedeOrigenId ? '#8b5cf6' : '#d1d5db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: sedeOrigenId ? 'pointer' : 'not-allowed',
              marginBottom: '1rem'
            }}
          >
            🔍 + Agregar Productos
          </button>

          {productosTraspaso.length === 0 ? (
            <div style={{
              padding: '2rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              Selecciona productos para traspasar
            </div>
          ) : (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {!isMobile && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr 120px 120px 60px',
                  gap: '1rem',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}>
                  <div>Código</div>
                  <div>Nombre</div>
                  <div style={{ textAlign: 'center' }}>Stock</div>
                  <div style={{ textAlign: 'center' }}>Cantidad</div>
                  <div style={{ textAlign: 'center' }}>Acción</div>
                </div>
              )}

              {productosTraspaso.map((producto) => (
                isMobile ? (
                  <div
                    key={producto.id}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: 'white'
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                      {producto.codigo} - {producto.nombre}
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.875rem'
                    }}>
                      <div>
                        <span style={{ color: '#6b7280' }}>Stock: </span>
                        <strong>{producto.stockDisponible}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="number"
                          value={producto.cantidad}
                          onChange={(e) => actualizarCantidad(producto.id, parseInt(e.target.value))}
                          min="1"
                          max={producto.stockDisponible}
                          style={{
                            width: '60px',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            textAlign: 'center'
                          }}
                        />
                        <button
                          onClick={() => eliminarProducto(producto.id)}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={producto.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 2fr 120px 120px 60px',
                      gap: '1rem',
                      padding: '1rem',
                      alignItems: 'center',
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: 'white'
                    }}
                  >
                    <div style={{ fontSize: '0.875rem' }}>{producto.codigo}</div>
                    <div style={{ fontSize: '0.875rem' }}>{producto.nombre}</div>
                    <div style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>
                      {producto.stockDisponible}
                    </div>
                    <div>
                      <input
                        type="number"
                        value={producto.cantidad}
                        onChange={(e) => actualizarCantidad(producto.id, parseInt(e.target.value))}
                        min="1"
                        max={producto.stockDisponible}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          textAlign: 'center'
                        }}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => eliminarProducto(producto.id)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {productosTraspaso.length > 0 && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '6px',
              border: '1px solid #10b981'
            }}>
              <div style={{ fontWeight: '600', color: '#065f46' }}>
                📊 Total de productos: {productosTraspaso.length}
              </div>
            </div>
          )}
        </div>

        {/* 3. INFORMACIÓN ADICIONAL */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            📝 3. Información Adicional
          </h2>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Motivo del Traspaso
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Reposición de stock, solicitud de cliente, etc."
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
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Notas adicionales para la sede destino..."
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
          paddingTop: '1rem',
          borderTop: '2px solid #e5e7eb'
        }}>
          <button
            onClick={() => router.push('/dashboard/traspasos')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            Cancelar
          </button>

          <button
            onClick={guardarTraspasos}
            disabled={guardando || productosTraspaso.length === 0}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: (guardando || productosTraspaso.length === 0) ? '#9ca3af' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (guardando || productosTraspaso.length === 0) ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            {guardando ? '⏳ Enviando...' : `🔄 Enviar ${productosTraspaso.length} Traspaso(s)`}
          </button>
        </div>
      </div>

      {/* MODAL DE PRODUCTOS */}
      {mostrarModalProducto && (
        <div
          onClick={() => setMostrarModalProducto(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
              width: isMobile ? '95%' : '500px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700' }}>
                🔍 Buscar Productos
              </h3>
              <input
                type="text"
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                placeholder="Buscar por código o nombre..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div style={{
              overflow: 'auto',
              flex: 1,
              minHeight: '200px'
            }}>
              {productosFiltrados.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  {busquedaProducto ? '❌ No se encontraron productos' : '📦 Escribe para buscar...'}
                </div>
              ) : (
                productosFiltrados.map(producto => (
                  <div
                    key={producto.id}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      backgroundColor: productosTraspaso.find(p => p.id === producto.id) ? '#f3f4f6' : 'white'
                    }}
                    onMouseEnter={(e) => !productosTraspaso.find(p => p.id === producto.id) && (e.currentTarget.style.backgroundColor = '#f9fafb')}
                    onMouseLeave={(e) => !productosTraspaso.find(p => p.id === producto.id) && (e.currentTarget.style.backgroundColor = 'white')}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                          {producto.codigo}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          {producto.nombre}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          💾 Stock: <strong>{producto.stock}</strong> unidades
                        </div>
                      </div>
                      <button
                        onClick={() => agregarProducto(producto)}
                        disabled={productosTraspaso.find(p => p.id === producto.id) !== undefined}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: productosTraspaso.find(p => p.id === producto.id) ? '#d1d5db' : '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: productosTraspaso.find(p => p.id === producto.id) ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}
                      >
                        {productosTraspaso.find(p => p.id === producto.id) ? '✓ Añadido' : '+ Añadir'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{
              padding: '1rem',
              borderTop: '1px solid #e5e7eb',
              textAlign: 'right'
            }}>
              <button
                onClick={() => setMostrarModalProducto(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

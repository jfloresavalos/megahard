"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

interface Movimiento {
  id: string
  tipo: string
  cantidad: number
  stockAntes: number
  stockDespues: number
  saldo?: number
  anulado: boolean
  motivo: string | null
  referencia: string | null
  precioCompra: number | null
  precioVenta: number | null
  fecha: string
  estadoTraspaso?: string | null // Para TRASPASOS_ENTRADA
  usuarioAnulaId?: string | null
  fechaAnulacion?: string | null
  producto: {
    id: string
    nombre: string
    codigo: string
  }
  sede: {
    id: string
    nombre: string
  }
  usuario: {
    id: string
    nombre: string
  }
  sedeOrigen?: {
    nombre: string
  }
  sedeDestino?: {
    nombre: string
  }
}

export default function MovimientosPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  // Obtener fecha actual en zona horaria de Perú
  const obtenerFechaHoyPeru = () => {
    const ahora = new Date()
    // Convertir a hora de Lima (UTC-5)
    const fechaLima = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Lima' }))
    const year = fechaLima.getFullYear()
    const month = String(fechaLima.getMonth() + 1).padStart(2, '0')
    const day = String(fechaLima.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const hoy = obtenerFechaHoyPeru()
  const [filtros, setFiltros] = useState({
    tipo: '',
    sedeId: '',
    productoId: '',
    fechaDesde: hoy,
    fechaHasta: hoy
  })
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  })
  const [sedes, setSedes] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [usuario, setUsuario] = useState<any>(null)
  const [productoBuscado, setProductoBuscado] = useState('')
  const [mostrarModalProducto, setMostrarModalProducto] = useState(false)
  const [esAdmin, setEsAdmin] = useState(false)
  const [movimientoAAnular, setMovimientoAAnular] = useState<Movimiento | null>(null)
  const [anulando, setAnulando] = useState(false)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  const cargarSedes = useCallback(async () => {
    try {
      const response = await fetch('/api/sedes')
      const data = await response.json()
      if (data.success) {
        setSedes(data.sedes || [])
      }
    } catch (error) {
      console.error('Error al cargar sedes:', error)
    }
  }, [])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    cargarSedes()
    cargarProductos()
  }, [cargarSedes])

  const cargarProductos = useCallback(async () => {
    try {
      const response = await fetch('/api/productos?limit=1000')
      const data = await response.json()
      if (data.success) {
        setProductos(data.productos || [])
      }
    } catch (error) {
      console.error('Error al cargar productos:', error)
    }
  }, [])

  useEffect(() => {
    // Obtener usuario actual de la sesión
    if (session?.user) {
      setUsuario(session.user)
      setEsAdmin(session.user.rol === 'admin')
    }
  }, [session])

  const cargarMovimientos = async () => {
    if (!filtros.productoId) {
      alert('⚠️ Debe seleccionar un producto')
      return
    }

    try {
      setLoading(true)

      const params = new URLSearchParams()
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())
      params.append('productoId', filtros.productoId)

      if (filtros.tipo) params.append('tipo', filtros.tipo)
      if (filtros.sedeId) params.append('sedeId', filtros.sedeId)
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde)
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta)

      const response = await fetch(`/api/movimientos?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setMovimientos(data.movimientos)
        setHasSearched(true)
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }))
      }
    } catch (error) {
      console.error('Error al cargar movimientos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Recargar cuando cambie la paginación
  useEffect(() => {
    if (hasSearched && filtros.productoId) {
      cargarMovimientos()
    }
  }, [pagination.page])

  const obtenerColorTipo = (tipo: string): string => {
    const colores: Record<string, string> = {
      'INGRESO': '#10b981',
      'SALIDA': '#ef4444',
      'AJUSTE_POSITIVO': '#3b82f6',
      'AJUSTE_NEGATIVO': '#f59e0b',
      'TRASPASO_SALIDA': '#8b5cf6',
      'TRASPASO_ENTRADA': '#06b6d4',
      'USO_SERVICIO': '#6366f1',
      'DEVOLUCION': '#84cc16',
      'MERMA': '#dc2626'
    }
    return colores[tipo] || '#6b7280'
  }

  const obtenerIconoTipo = (tipo: string): string => {
    const iconos: Record<string, string> = {
      'INGRESO': '📥',
      'SALIDA': '📤',
      'AJUSTE_POSITIVO': '➕',
      'AJUSTE_NEGATIVO': '➖',
      'TRASPASO_SALIDA': '🚚',
      'TRASPASO_ENTRADA': '📦',
      'USO_SERVICIO': '🔧',
      'DEVOLUCION': '🔄',
      'MERMA': '⚠️'
    }
    return iconos[tipo] || '📋'
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const limpiarFiltros = () => {
    const hoy = obtenerFechaHoyPeru()
    setFiltros({
      tipo: '',
      sedeId: '',
      productoId: '',
      fechaDesde: hoy,
      fechaHasta: hoy
    })
    setMovimientos([])
    setHasSearched(false)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Función para determinar si un movimiento puede ser anulado
  const puedeAnularMovimiento = (mov: Movimiento): boolean => {
    // No se puede anular si ya está anulado
    if (mov.anulado) return false

    // ❌ TRASPASOS no se pueden anular desde aquí
    // Deben anularse desde el módulo de Traspasos
    if (mov.tipo === 'TRASPASO_SALIDA' || mov.tipo === 'TRASPASO_ENTRADA') {
      return false
    }

    // ✅ Todos los demás movimientos (INGRESO, EGRESO, AJUSTE, etc.) se pueden anular
    return true
  }

  const anularMovimiento = async () => {
    if (!movimientoAAnular) return

    // Validar que el movimiento aún pueda ser anulado
    if (!puedeAnularMovimiento(movimientoAAnular)) {
      alert('❌ Este movimiento no puede ser anulado')
      return
    }

    if (!motivoAnulacion.trim()) {
      alert('Debes especificar un motivo para anular el movimiento')
      return
    }

    try {
      setAnulando(true)
      const response = await fetch(`/api/movimientos/${movimientoAAnular.id}/anular`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          motivoAnulacion: motivoAnulacion.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        // Recargar los movimientos
        const params = new URLSearchParams()
        params.append('page', pagination.page.toString())
        params.append('limit', pagination.limit.toString())
        params.append('productoId', filtros.productoId)
        
        if (filtros.tipo) params.append('tipo', filtros.tipo)
        if (filtros.sedeId) params.append('sedeId', filtros.sedeId)
        if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde)
        if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta)

        const responseRecargar = await fetch(`/api/movimientos?${params.toString()}`)
        const dataRecargar = await responseRecargar.json()

        if (dataRecargar.success) {
          setMovimientos(dataRecargar.movimientos)
        }

        setMovimientoAAnular(null)
        setMotivoAnulacion('')
        console.log('Movimiento anulado correctamente')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error al anular:', error)
      alert('Error al anular el movimiento')
    } finally {
      setAnulando(false)
    }
  }

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: isMobile ? '0.5rem' : '1rem' 
    }}>
      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <h1 style={{
          fontSize: isMobile ? '1.5rem' : '2rem',
          fontWeight: 'bold',
          margin: 0
        }}>
          📊 Movimientos de Inventario
        </h1>

        <button
          onClick={() => router.push('/dashboard/movimientos/nuevo')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          + Nuevo Movimiento
        </button>
      </div>

      {/* FILTROS */}
      <div style={{
        backgroundColor: 'white',
        padding: isMobile ? '1rem' : '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {/* SELECTOR DE PRODUCTO - REQUERIDO */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600',
              fontSize: '0.875rem',
              color: '#dc2626'
            }}>
              Selecciona un Producto *
            </label>
            <button
              onClick={() => setMostrarModalProducto(true)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #3b82f6',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: filtros.productoId ? '#dbeafe' : 'white',
                color: '#1e40af',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '0.5rem'
              }}
            >
              {filtros.productoId ? '✓ Producto Seleccionado' : '🔍 Buscar Producto...'}
            </button>
            {!filtros.productoId && (
              <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0' }}>
                ⚠️ Debe seleccionar un producto para ver movimientos e ingresos/traspasos
              </div>
            )}
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              fontSize: '0.875rem'
            }}>
              Tipo de Movimiento
            </label>
            <select
              value={filtros.tipo}
              onChange={(e) => {
                setFiltros(prev => ({ ...prev, tipo: e.target.value }))
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Todos los tipos</option>
              <option value="INGRESO">📥 Ingreso</option>
              <option value="SALIDA">📤 Salida</option>
              <option value="AJUSTE_POSITIVO">➕ Ajuste Positivo</option>
              <option value="AJUSTE_NEGATIVO">➖ Ajuste Negativo</option>
              <option value="TRASPASO_SALIDA">🚚 Traspaso Salida</option>
              <option value="TRASPASO_ENTRADA">📦 Traspaso Entrada</option>
              <option value="USO_SERVICIO">🔧 Uso en Servicio</option>
              <option value="DEVOLUCION">🔄 Devolución</option>
              <option value="MERMA">⚠️ Merma</option>
            </select>
          </div>

          {/* SELECTOR DE SEDE - SOLO PARA ADMIN */}
          {esAdmin && (
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                fontSize: '0.875rem'
              }}>
                Sede
              </label>
              <select
                value={filtros.sedeId}
                onChange={(e) => {
                  setFiltros(prev => ({ ...prev, sedeId: e.target.value }))
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">Todas las sedes</option>
                {sedes.map(sede => (
                  <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              fontSize: '0.875rem'
            }}>
              Fecha Desde
            </label>
            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={(e) => {
                setFiltros(prev => ({ ...prev, fechaDesde: e.target.value }))
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              fontSize: '0.875rem'
            }}>
              Fecha Hasta
            </label>
            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={(e) => {
                setFiltros(prev => ({ ...prev, fechaHasta: e.target.value }))
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={cargarMovimientos}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            🔍 Buscar
          </button>
          <button
            onClick={limpiarFiltros}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* LISTA DE MOVIMIENTOS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          ⏳ Cargando movimientos...
        </div>
      ) : movimientos.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {!hasSearched ? (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Selecciona un Producto
              </div>
              <div style={{ color: '#6b7280' }}>
                Elige un producto en los filtros para ver sus movimientos
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                No hay movimientos
              </div>
              <div style={{ color: '#6b7280' }}>
                Registra tu primer movimiento de inventario
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: isMobile ? '1rem' : '1.5rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <strong>Total: {pagination.total} movimientos</strong>
          </div>

          {isMobile ? (
            // VISTA MÓVIL - CARDS
            <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
              {movimientos.map((mov) => (
                <div
                  key={mov.id}
                  onClick={() => router.push(`/dashboard/movimientos/${mov.id}`)}
                  style={{
                    padding: '1rem',
                    backgroundColor: mov.anulado ? '#f3f4f6' : '#f9fafb',
                    borderRadius: '8px',
                    border: mov.anulado ? '2px solid #ef4444' : '1px solid #e5e7eb',
                    cursor: 'pointer',
                    opacity: mov.anulado ? 0.7 : 1
                  }}
                >
                  {mov.anulado && (
                    <div style={{
                      padding: '0.5rem',
                      backgroundColor: '#fee2e2',
                      borderRadius: '6px',
                      marginBottom: '0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#991b1b',
                      textAlign: 'center'
                    }}>
                      ❌ MOVIMIENTO ANULADO
                    </div>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem'
                  }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: obtenerColorTipo(mov.tipo) + '20',
                      color: obtenerColorTipo(mov.tipo),
                      textDecoration: mov.anulado ? 'line-through' : 'none'
                    }}>
                      {obtenerIconoTipo(mov.tipo)} {mov.tipo.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {formatearFecha(mov.fecha)}
                    </span>
                  </div>

                  <div style={{ 
                    fontWeight: '600', 
                    marginBottom: '0.5rem',
                    textDecoration: mov.anulado ? 'line-through' : 'none'
                  }}>
                    {mov.producto.codigo} - {mov.producto.nombre}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    fontSize: '0.875rem'
                  }}>
                    <div>
                      <span style={{ color: '#6b7280' }}>Cantidad: </span>
                      <strong style={{
                        color: ['INGRESO', 'AJUSTE_POSITIVO', 'TRASPASO_ENTRADA', 'DEVOLUCION'].includes(mov.tipo)
                          ? '#10b981' : '#ef4444'
                      }}>
                        {['INGRESO', 'AJUSTE_POSITIVO', 'TRASPASO_ENTRADA', 'DEVOLUCION'].includes(mov.tipo) ? '+' : '-'}
                        {mov.cantidad}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Stock: </span>
                      <strong>{mov.stockAntes} → {mov.stockDespues}</strong>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '0.75rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginBottom: '0.75rem'
                  }}>
                    📍 {mov.sede.nombre} | 👤 {mov.usuario.nombre}
                  </div>

                  {puedeAnularMovimiento(mov) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMovimientoAAnular(mov)
                      }}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ❌ Anular
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // VISTA DESKTOP - TABLA (ESTILO KARDEX)
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                      Fecha
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                      Tipo
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem', color: '#10b981' }}>
                      Entrada
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem', color: '#ef4444' }}>
                      Salida
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem', color: '#3b82f6' }}>
                      Saldo
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                      Referencia
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                      Sede
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                      Usuario
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov, index) => {
                    const isEntrada = ['INGRESO', 'AJUSTE_POSITIVO', 'TRASPASO_ENTRADA', 'DEVOLUCION'].includes(mov.tipo);
                    return (
                      <tr
                        key={mov.id}
                        style={{
                          backgroundColor: mov.anulado ? '#fee2e2' : (index % 2 === 0 ? 'white' : '#f9fafb'),
                          borderBottom: mov.anulado ? '2px solid #ef4444' : '1px solid #e5e7eb',
                          opacity: mov.anulado ? 0.7 : 1,
                          position: 'relative'
                        }}
                      >
                        {mov.anulado && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: 0,
                            right: 0,
                            transform: 'translateY(-50%)',
                            height: '2px',
                            backgroundColor: '#991b1b',
                            pointerEvents: 'none'
                          }}/>
                        )}
                        <td style={{ 
                          padding: '1rem', 
                          fontSize: '0.875rem',
                          textDecoration: mov.anulado ? 'line-through' : 'none'
                        }}>
                          {formatearFecha(mov.fecha)}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: obtenerColorTipo(mov.tipo) + '20',
                            color: obtenerColorTipo(mov.tipo),
                            textDecoration: mov.anulado ? 'line-through' : 'none'
                          }}>
                            {obtenerIconoTipo(mov.tipo)} {mov.tipo.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{
                          padding: '1rem',
                          textAlign: 'center',
                          fontWeight: '700',
                          color: '#10b981',
                          fontSize: '0.95rem',
                          textDecoration: mov.anulado ? 'line-through' : 'none'
                        }}>
                          {isEntrada ? `+${mov.cantidad}` : ''}
                        </td>
                        <td style={{
                          padding: '1rem',
                          textAlign: 'center',
                          fontWeight: '700',
                          color: '#ef4444',
                          fontSize: '0.95rem',
                          textDecoration: mov.anulado ? 'line-through' : 'none'
                        }}>
                          {!isEntrada ? `-${mov.cantidad}` : ''}
                        </td>
                        <td style={{
                          padding: '1rem',
                          textAlign: 'center',
                          fontWeight: '700',
                          color: '#3b82f6',
                          fontSize: '1rem',
                          backgroundColor: mov.anulado ? '#fca5a5' : '#dbeafe',
                          textDecoration: mov.anulado ? 'line-through' : 'none'
                        }}>
                          {(mov as any).saldo || mov.stockDespues}
                        </td>
                        <td style={{ 
                          padding: '1rem', 
                          fontSize: '0.875rem',
                          textDecoration: mov.anulado ? 'line-through' : 'none'
                        }}>
                          <div>{mov.referencia || '-'}</div>
                          {mov.motivo && (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {mov.motivo}
                            </div>
                          )}
                        </td>
                        <td style={{ 
                          padding: '1rem', 
                          fontSize: '0.875rem',
                          textDecoration: mov.anulado ? 'line-through' : 'none'
                        }}>
                          {mov.sede.nombre}
                        </td>
                        <td style={{ 
                          padding: '1rem', 
                          fontSize: '0.875rem',
                          textDecoration: mov.anulado ? 'line-through' : 'none'
                        }}>
                          {mov.usuario?.nombre || 'Sistema'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {puedeAnularMovimiento(mov) && (
                            <button
                              onClick={() => setMovimientoAAnular(mov)}
                              style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}
                            >
                              ❌ Anular
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINACIÓN */}
          {pagination.totalPages > 1 && (
            <div style={{
              padding: '1rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: pagination.page === 1 ? '#e5e7eb' : '#3b82f6',
                  color: pagination.page === 1 ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: pagination.page === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ← Anterior
              </button>

              <span style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px'
              }}>
                Página {pagination.page} de {pagination.totalPages}
              </span>

              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: pagination.page === pagination.totalPages ? '#e5e7eb' : '#3b82f6',
                  color: pagination.page === pagination.totalPages ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE BÚSQUEDA DE PRODUCTOS */}
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
              width: isMobile ? '90%' : '600px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* HEADER */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '2px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>
                🔍 Seleccionar Producto
              </h2>
              <button
                onClick={() => setMostrarModalProducto(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>

            {/* BUSCADOR */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={productoBuscado}
                onChange={(e) => setProductoBuscado(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* LISTA DE PRODUCTOS */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.5rem'
            }}>
              {productos
                .filter(p => 
                  productoBuscado === '' || 
                  p.nombre.toLowerCase().includes(productoBuscado.toLowerCase()) ||
                  p.codigo.toLowerCase().includes(productoBuscado.toLowerCase())
                )
                .length === 0 ? (
                <div style={{
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  No se encontraron productos
                </div>
              ) : (
                productos
                  .filter(p => 
                    productoBuscado === '' || 
                    p.nombre.toLowerCase().includes(productoBuscado.toLowerCase()) ||
                    p.codigo.toLowerCase().includes(productoBuscado.toLowerCase())
                  )
                  .map(producto => (
                    <button
                      key={producto.id}
                      onClick={() => {
                        setFiltros(prev => ({ ...prev, productoId: producto.id }))
                        setPagination(prev => ({ ...prev, page: 1 }))
                        setMostrarModalProducto(false)
                        setProductoBuscado('')
                      }}
                      style={{
                        width: '100%',
                        padding: '1rem 1.5rem',
                        border: 'none',
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: filtros.productoId === producto.id ? '#dbeafe' : 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => {
                        if (filtros.productoId !== producto.id) {
                          e.currentTarget.style.backgroundColor = '#f3f4f6'
                        }
                      }}
                      onMouseOut={(e) => {
                        if (filtros.productoId !== producto.id) {
                          e.currentTarget.style.backgroundColor = 'white'
                        }
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        {producto.codigo} - {producto.nombre}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {producto.subcategoria?.categoria?.nombre} → {producto.subcategoria?.nombre}
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ANULACIÓN */}
      {movimientoAAnular && (
        <div
          onClick={() => setMovimientoAAnular(null)}
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
            zIndex: 1001
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
              width: isMobile ? '90%' : '400px',
              padding: '2rem',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700' }}>
              ¿Anular este movimiento?
            </h2>

            <div style={{
              backgroundColor: '#fef2f2',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              textAlign: 'left',
              fontSize: '0.875rem',
              color: '#991b1b'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Producto:</strong> {movimientoAAnular.producto.nombre}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Tipo:</strong> {movimientoAAnular.tipo.replace(/_/g, ' ')}
              </div>
              <div>
                <strong>Cantidad:</strong> {movimientoAAnular.cantidad} unidades
              </div>
            </div>

            <div style={{
              color: '#6b7280',
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              El stock será revertido a {movimientoAAnular.stockAntes} unidades
            </div>

            <div style={{
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Motivo de anulación *
              </label>
              <textarea
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="Ej: Error en cantidad, movimiento duplicado, etc."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  minHeight: '80px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
              {!motivoAnulacion.trim() && (
                <div style={{
                  fontSize: '0.75rem',
                  color: '#ef4444',
                  marginTop: '0.25rem'
                }}>
                  ⚠️ El motivo es obligatorio
                </div>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem'
            }}>
              <button
                onClick={() => {
                  setMovimientoAAnular(null)
                  setMotivoAnulacion('')
                }}
                disabled={anulando}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: anulando ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: anulando ? 0.6 : 1
                }}
              >
                Cancelar
              </button>
              <button
                onClick={anularMovimiento}
                disabled={anulando || !motivoAnulacion.trim()}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: !motivoAnulacion.trim() ? '#d1d5db' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (anulando || !motivoAnulacion.trim()) ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: (anulando || !motivoAnulacion.trim()) ? 0.6 : 1
                }}
              >
                {anulando ? '⏳ Anulando...' : '❌ Anular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
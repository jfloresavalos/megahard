"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"

interface KardexEntry {
  id: string
  fecha: string
  tipo: string
  referencia: string
  motivo: string
  entradas: number
  salidas: number
  saldo: number
  sede: string
  usuario: string
  precioCompra: number | null
  precioVenta: number | null
  sedeOrigen: string | null
  sedeDestino: string | null
  servicioTecnico: string | null
  venta: string | null
  observaciones: string | null
}

interface Estadisticas {
  stockActual: number
  precioCompra: number
  precioVenta: number
  totalIngresos: number
  totalSalidas: number
  totalAjustesPositivos: number
  totalAjustesNegativos: number
  totalTraspasosSalida: number
  totalTraspasosEntrada: number
  totalUsoServicios: number
  totalDevoluciones: number
  totalMermas: number
  cantidadMovimientos: number
}

export default function KardexProductoPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const productoId = params.id as string

  const [producto, setProducto] = useState<any>(null)
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [kardex, setKardex] = useState<KardexEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({
    tipo: '',
    fechaDesde: '',
    fechaHasta: ''
  })
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0
  })
  const [isMobile, setIsMobile] = useState(false)
  const [usuario, setUsuario] = useState<any>(null)
  const [sedeIdParam, setSedeIdParam] = useState<string | null>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (session?.user) {
      setUsuario(session.user)
    }
  }, [session])

  useEffect(() => {
    // Obtener sedeId de los parámetros de la URL si existe
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const sede = searchParams.get('sedeId')
      setSedeIdParam(sede)
    }
  }, [])

  useEffect(() => {
    if (productoId && usuario) {
      cargarKardex()
    }
  }, [productoId, usuario, sedeIdParam, filtros, pagination.page])

  const cargarKardex = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())
      
      if (filtros.tipo) params.append('tipo', filtros.tipo)
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde)
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta)
      
      // Lógica de sede:
      // - Si Admin vino desde Movimientos (sedeIdParam), mostrar esa sede específica
      // - Si Admin sin parámetro, mostrar todas las sedes (sin filtro)
      // - Si Usuario normal, mostrar solo su sede
      if (sedeIdParam) {
        // Admin viendo desde Movimientos con sede específica
        params.append('sedeId', sedeIdParam)
      } else if (usuario && usuario.rol !== 'ADMIN' && usuario.sedeId) {
        // Usuario normal ve solo su sede
        params.append('sedeId', usuario.sedeId)
      }

      const response = await fetch(`/api/productos/${productoId}/kardex?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setProducto(data.producto)
        setEstadisticas(data.estadisticas)
        setKardex(data.kardex)
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }))
      }
    } catch (error) {
      console.error('Error al cargar kardex:', error)
    } finally {
      setLoading(false)
    }
  }

  const obtenerColorTipo = (tipo: string) => {
    const colores: any = {
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

  const obtenerIconoTipo = (tipo: string) => {
    const iconos: any = {
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
    setFiltros({
      tipo: '',
      fechaDesde: '',
      fechaHasta: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  if (loading && !producto) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
        ⏳ Cargando kardex...
      </div>
    )
  }

  if (!producto) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
        ❌ Producto no encontrado
      </div>
    )
  }

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: isMobile ? '0.5rem' : '1rem' 
    }}>
      {/* HEADER */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push(sedeIdParam ? '/dashboard/movimientos' : '/dashboard/productos')}
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
          ← Volver {sedeIdParam ? 'a Movimientos' : 'a Productos'}
        </button>

        <h1 style={{
          fontSize: isMobile ? '1.5rem' : '2rem',
          fontWeight: 'bold',
          margin: '0 0 0.5rem 0'
        }}>
          📋 Kardex de Producto
        </h1>

        {sedeIdParam && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#ddd6fe',
            borderRadius: '8px',
            border: '2px solid #8b5cf6',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#6d28d9',
            fontWeight: '600'
          }}>
            👉 Vista desde Movimientos (Sede específica)
          </div>
        )}

        <div style={{
          padding: '1rem',
          backgroundColor: '#dbeafe',
          borderRadius: '8px',
          border: '2px solid #3b82f6'
        }}>
          <div style={{ fontWeight: '700', fontSize: '1.25rem', color: '#1e40af' }}>
            {producto.codigo} - {producto.nombre}
          </div>
          <div style={{ fontSize: '0.95rem', color: '#1e40af', marginTop: '0.5rem' }}>
            Categoría: {producto.categoria} | 
            Stock Actual: <strong>{producto.stockActual}</strong> unidades
          </div>
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      {estadisticas && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: isMobile ? '0.75rem' : '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Stock Actual</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
              {estadisticas.stockActual}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Ingresos</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
              +{estadisticas.totalIngresos}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Salidas</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>
              -{estadisticas.totalSalidas}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Traspasos</div>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#8b5cf6' }}>
              📤 {estadisticas.totalTraspasosSalida} | 📥 {estadisticas.totalTraspasosEntrada}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Mermas</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
              {estadisticas.totalMermas}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Movimientos</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#6b7280' }}>
              {estadisticas.cantidadMovimientos}
            </div>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Tipo
            </label>
            <select
              value={filtros.tipo}
              onChange={(e) => {
                setFiltros(prev => ({ ...prev, tipo: e.target.value }))
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Todos</option>
              <option value="INGRESO">Ingreso</option>
              <option value="SALIDA">Salida</option>
              <option value="AJUSTE_POSITIVO">Ajuste +</option>
              <option value="AJUSTE_NEGATIVO">Ajuste -</option>
              <option value="TRASPASO_SALIDA">Traspaso Salida</option>
              <option value="TRASPASO_ENTRADA">Traspaso Entrada</option>
              <option value="USO_SERVICIO">Uso en Servicio</option>
              <option value="DEVOLUCION">Devolución</option>
              <option value="MERMA">Merma</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Desde
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
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Hasta
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
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              onClick={limpiarFiltros}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                width: '100%'
              }}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* TABLA DE KARDEX */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: '2px solid #e5e7eb',
          fontWeight: '600'
        }}>
          📊 Movimientos ({pagination.total} registros)
        </div>

        {kardex.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            No hay movimientos registrados
          </div>
        ) : isMobile ? (
          // VISTA MÓVIL
          <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
            {kardex.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    backgroundColor: obtenerColorTipo(entry.tipo) + '20',
                    color: obtenerColorTipo(entry.tipo)
                  }}>
                    {obtenerIconoTipo(entry.tipo)} {entry.tipo.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                    {formatearFecha(entry.fecha)}
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '0.5rem',
                  textAlign: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Entrada</div>
                    <div style={{ fontWeight: '700', color: '#10b981' }}>
                      {entry.entradas > 0 ? `+${entry.entradas}` : '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Salida</div>
                    <div style={{ fontWeight: '700', color: '#ef4444' }}>
                      {entry.salidas > 0 ? `-${entry.salidas}` : '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Saldo</div>
                    <div style={{ fontWeight: '700', color: '#3b82f6' }}>
                      {entry.saldo}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {entry.referencia !== '-' && <div>🔖 {entry.referencia}</div>}
                  {entry.motivo !== '-' && <div>📝 {entry.motivo}</div>}
                  <div>👤 {entry.usuario} | 📍 {entry.sede}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // VISTA DESKTOP
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.8rem' }}>
                    Fecha
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.8rem' }}>
                    Tipo
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.8rem' }}>
                    Referencia
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', fontSize: '0.8rem', color: '#10b981' }}>
                    Entradas
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', fontSize: '0.8rem', color: '#ef4444' }}>
                    Salidas
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', fontSize: '0.8rem', color: '#3b82f6' }}>
                    Saldo
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.8rem' }}>
                    Sede
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.8rem' }}>
                    Usuario
                  </th>
                </tr>
              </thead>
              <tbody>
                {kardex.map((entry, index) => (
                  <tr
                    key={entry.id}
                    style={{
                      backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                      borderBottom: '1px solid #e5e7eb'
                    }}
                  >
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                      {formatearFecha(entry.fecha)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        backgroundColor: obtenerColorTipo(entry.tipo) + '20',
                        color: obtenerColorTipo(entry.tipo)
                      }}>
                        {obtenerIconoTipo(entry.tipo)} {entry.tipo.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                      <div>{entry.referencia}</div>
                      {entry.motivo !== '-' && (
                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                          {entry.motivo}
                        </div>
                      )}
                    </td>
                    <td style={{
                      padding: '0.75rem',
                      textAlign: 'center',
                      fontWeight: '700',
                      color: '#10b981',
                      fontSize: '0.9rem'
                    }}>
                      {entry.entradas > 0 ? `+${entry.entradas}` : ''}
                    </td>
                    <td style={{
                      padding: '0.75rem',
                      textAlign: 'center',
                      fontWeight: '700',
                      color: '#ef4444',
                      fontSize: '0.9rem'
                    }}>
                      {entry.salidas > 0 ? `-${entry.salidas}` : ''}
                    </td>
                    <td style={{
                      padding: '0.75rem',
                      textAlign: 'center',
                      fontWeight: '700',
                      color: '#3b82f6',
                      fontSize: '1rem'
                    }}>
                      {entry.saldo}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                      {entry.sede}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                      {entry.usuario}
                    </td>
                  </tr>
                ))}
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
              {pagination.page} / {pagination.totalPages}
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
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface Servicio {
  id: string
  numeroServicio: string
  clienteNombre: string
  tipoEquipo: string
  tipoServicio: string // ✅ TALLER o DOMICILIO
  estado: string
  prioridad: string
  total: number
  saldo: number
  createdAt: string
  tecnico?: {
    nombre: string
  }
  usuario?: {
    nombre: string
  }
  sede: {
    nombre: string
  }
}

interface Sede {
  id: string
  nombre: string
}

export default function ServiciosTecnicosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [filtroSede, setFiltroSede] = useState('TODAS')
  const [filtroTipo, setFiltroTipo] = useState('TODOS') // ✅ Filtro de tipo de servicio
  const [busquedaCliente, setBusquedaCliente] = useState('') // ✅ Búsqueda por cliente (DNI/RUC/Nombre)

  // Filtros de fecha - Por defecto: hoy
  const [fechaDesde, setFechaDesde] = useState(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [fechaHasta, setFechaHasta] = useState(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })

  const esAdmin = session?.user?.rol === 'admin'

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (esAdmin) {
      cargarSedes()
    }
  }, [esAdmin])

  useEffect(() => {
    cargarServicios()
  }, [filtroEstado, filtroSede, filtroTipo, fechaDesde, fechaHasta])

  const cargarSedes = async () => {
    try {
      const response = await fetch('/api/sedes')
      const data = await response.json()
      if (data.success) {
        setSedes(data.sedes)
      }
    } catch (error) {
      console.error('Error al cargar sedes:', error)
    }
  }

  const cargarServicios = async () => {
    try {
      setLoading(true)

      let url = '/api/servicios'
      const params = new URLSearchParams()

      // Si es admin y seleccionó una sede específica
      if (esAdmin && filtroSede !== 'TODAS') {
        params.append('sedeId', filtroSede)
      }
      // Si NO es admin, filtrar por su sede
      else if (!esAdmin && session?.user?.sedeId) {
        params.append('sedeId', session.user.sedeId)
      }

      if (filtroEstado !== 'TODOS') {
        params.append('estado', filtroEstado)
      }

      // ✅ Filtro de tipo de servicio
      if (filtroTipo !== 'TODOS') {
        params.append('tipoServicio', filtroTipo)
      }

      // Filtros de fecha
      if (fechaDesde) {
        params.append('fechaDesde', fechaDesde)
      }
      if (fechaHasta) {
        params.append('fechaHasta', fechaHasta)
      }

      // ✅ Filtro de búsqueda de cliente
      if (busquedaCliente && busquedaCliente.trim()) {
        params.append('busquedaCliente', busquedaCliente.trim())
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setServicios(data.servicios)
      }
    } catch (error) {
      console.error('Error al cargar servicios:', error)
    } finally {
      setLoading(false)
    }
  }

  const obtenerColorEstado = (estado: string) => {
    const colores: any = {
      'RECEPCIONADO': '#3b82f6',
      'EN_DOMICILIO': '#3b82f6', // ✅ Mismo color que RECEPCIONADO
      'EN_DIAGNOSTICO': '#f59e0b',
      'EN_REPARACION': '#8b5cf6',
      'ESPERANDO_REPUESTOS': '#ef4444',
      'REPARADO': '#10b981',
      'ENTREGADO': '#6b7280',
      'CANCELADO': '#dc2626'
    }
    return colores[estado] || '#6b7280'
  }

  const obtenerColorPrioridad = (prioridad: string) => {
    const colores: any = {
      'URGENTE': '#dc2626',
      'ALTA': '#f59e0b',
      'NORMAL': '#3b82f6',
      'BAJA': '#6b7280'
    }
    return colores[prioridad] || '#6b7280'
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const buscarServicios = () => {
    cargarServicios()
  }

  const limpiarFiltros = () => {
    setFechaDesde('')
    setFechaHasta('')
    setBusquedaCliente('')
    // La función cargarServicios se ejecutará automáticamente por el useEffect
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '1.25rem',
        color: '#6b7280'
      }}>
        ⏳ Cargando servicios...
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <h1 style={{
          fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
          fontWeight: 'bold',
          margin: 0
        }}>
          🔧 Servicios Técnicos
        </h1>

        <button
          onClick={() => router.push('/dashboard/servicios/nuevo')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}
        >
          + Nuevo Servicio
        </button>
      </div>

      {/* Filtros */}
      <div style={{
        backgroundColor: 'white',
        padding: isMobile ? '1rem' : '1.5rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, auto))',
          gap: isMobile ? '0.75rem' : '1rem',
          alignItems: isMobile ? 'stretch' : 'center'
        }}>
          {/* Filtro de Sede (solo para admin) */}
          {esAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontWeight: '600', fontSize: isMobile ? '0.75rem' : '0.85rem', color: '#6b7280' }}>
                Sede
              </label>
              <select
                value={filtroSede}
                onChange={(e) => setFiltroSede(e.target.value)}
                style={{
                  padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '0.85rem' : '0.95rem',
                  width: '100%'
                }}
              >
                <option value="TODAS">Todas</option>
                {sedes.map(sede => (
                  <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro de Tipo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontWeight: '600', fontSize: isMobile ? '0.75rem' : '0.85rem', color: '#6b7280' }}>
              Tipo
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{
                padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: isMobile ? '0.85rem' : '0.95rem',
                width: '100%'
              }}
            >
              <option value="TODOS">Todos</option>
              <option value="TALLER">🔧 Taller</option>
              <option value="DOMICILIO">🏠 Domicilio</option>
            </select>
          </div>

          {/* Filtro de Estado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontWeight: '600', fontSize: isMobile ? '0.75rem' : '0.85rem', color: '#6b7280' }}>
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={{
                padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: isMobile ? '0.85rem' : '0.95rem',
                width: '100%'
              }}
            >
              <option value="TODOS">Todos</option>
              <option value="RECEPCIONADO">Recepcionado</option>
              <option value="EN_DOMICILIO">En Domicilio</option>
              <option value="EN_REPARACION">En reparación</option>
              <option value="REPARADO">Reparado</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="PAGO_PENDIENTE">💰 Pago Pendiente</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          {/* Búsqueda de Cliente */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontWeight: '600', fontSize: isMobile ? '0.75rem' : '0.85rem', color: '#6b7280' }}>
              🔍 Cliente
            </label>
            <input
              type="text"
              placeholder="DNI, RUC o Nombre..."
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  buscarServicios()
                }
              }}
              style={{
                padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: isMobile ? '0.85rem' : '0.95rem',
                width: '100%'
              }}
            />
          </div>

          {/* Filtros de Fecha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontWeight: '600', fontSize: isMobile ? '0.75rem' : '0.85rem', color: '#6b7280' }}>
              📅 Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{
                padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: isMobile ? '0.85rem' : '0.95rem',
                width: '100%'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontWeight: '600', fontSize: isMobile ? '0.75rem' : '0.85rem', color: '#6b7280' }}>
              Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{
                padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: isMobile ? '0.85rem' : '0.95rem',
                width: '100%'
              }}
            />
          </div>

          {/* Botones de Buscar y Limpiar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', justifyContent: 'flex-end' }}>
            {!isMobile && <label style={{ height: '1.25rem' }}>&nbsp;</label>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={buscarServicios}
                style={{
                  padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.85rem' : '0.875rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
              >
                🔍 Buscar
              </button>
              <button
                onClick={limpiarFiltros}
                style={{
                  padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.85rem' : '0.875rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Contador de resultados */}
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e5e7eb',
          fontSize: isMobile ? '0.85rem' : '0.95rem',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          <strong>{servicios.length}</strong> servicio{servicios.length !== 1 ? 's' : ''} encontrado{servicios.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lista de servicios */}
      {servicios.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔧</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            No hay servicios registrados
          </div>
          <div style={{ fontSize: '0.95rem' }}>
            Comienza registrando tu primer servicio técnico
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))'
        }}>
          {servicios.map(servicio => (
            <div
              key={servicio.id}
              onClick={() => router.push(`/dashboard/servicios/${servicio.id}`)}
              style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: '2px solid transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
                e.currentTarget.style.borderColor = '#3b82f6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                e.currentTarget.style.borderColor = 'transparent'
              }}
            >
              {/* Header de la tarjeta */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '2px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#111827'
                  }}>
                    {servicio.numeroServicio}
                  </div>
                  {/* Badge de tipo de servicio */}
                  <div style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.65rem',
                    fontWeight: '600',
                    backgroundColor: servicio.tipoServicio === 'DOMICILIO' ? '#10b98120' : '#3b82f620',
                    color: servicio.tipoServicio === 'DOMICILIO' ? '#10b981' : '#3b82f6',
                    border: `1px solid ${servicio.tipoServicio === 'DOMICILIO' ? '#10b981' : '#3b82f6'}`
                  }}>
                    {servicio.tipoServicio === 'DOMICILIO' ? '🏠 DOM' : '🔧 TALL'}
                  </div>
                </div>
                <div style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: obtenerColorEstado(servicio.estado) + '20',
                  color: obtenerColorEstado(servicio.estado)
                }}>
                  {servicio.estado.replace(/_/g, ' ')}
                </div>
              </div>

              {/* Información del cliente */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '0.25rem'
                }}>
                  {servicio.clienteNombre}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  {servicio.tipoEquipo}
                </div>
              </div>

              {/* Detalles */}
              <div style={{
                display: 'grid',
                gap: '0.5rem',
                fontSize: '0.875rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Técnico:</span>
                  <span style={{ fontWeight: '600' }}>
                    {servicio.tecnico?.nombre || servicio.usuario?.nombre || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Sede:</span>
                  <span style={{ fontWeight: '600' }}>{servicio.sede.nombre}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Fecha:</span>
                  <span style={{ fontWeight: '600' }}>{formatearFecha(servicio.createdAt)}</span>
                </div>
              </div>

              {/* Footer con totales */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.75rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#10b981' }}>
                    S/ {Number(servicio.total).toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Saldo</div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: servicio.saldo > 0 ? '#ef4444' : '#10b981'
                  }}>
                    S/ {Number(servicio.saldo).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Badge: Pendiente de Pago */}
              {servicio.estado === 'ENTREGADO' && Number(servicio.saldo) > 0 && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  border: '2px solid #f59e0b'
                }}>
                  💳 Pago Pendiente
                </div>
              )}

              {/* Badge de prioridad */}
              {servicio.prioridad !== 'NORMAL' && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: obtenerColorPrioridad(servicio.prioridad) + '20',
                  color: obtenerColorPrioridad(servicio.prioridad)
                }}>
                  {servicio.prioridad === 'URGENTE' && '🔴 URGENTE'}
                  {servicio.prioridad === 'ALTA' && '🟠 PRIORIDAD ALTA'}
                  {servicio.prioridad === 'BAJA' && '🔵 PRIORIDAD BAJA'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
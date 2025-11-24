"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"

interface Cliente {
  id: string
  nombre: string
  numeroDoc: string
  tipoDoc: string
  telefono: string | null
  email: string | null
  direccion: string | null
  createdAt: string
}

interface Estadisticas {
  totalServicios: number
  serviciosActivos: number
  totalGastadoServicios: number
  deudaServicios: number
  totalVentas: number
  totalGastadoVentas: number
  totalGastado: number
  totalPagado: number
  deudaTotal: number
  ultimaVisita: string
  fechaRegistro: string
}

interface Servicio {
  id: string
  numeroServicio: string
  estado: string
  tipoEquipo: string
  marcaModelo?: string
  fecha: string
  total: number
  saldo: number
}

interface Venta {
  id: string
  numeroVenta: string
  fecha: string
  items: number
  productosResumen?: string[]
  masProductos?: string
  total: number
}

interface EstadoCuenta {
  resumen: {
    totalServicios: number
    totalVentas: number
    totalGeneral: number
    totalPagado: number
    deudaTotal: number
  }
  pendientes?: Array<{
    referencia: string
    fecha: string
    saldo: number
  }>
  transacciones?: Array<{
    id: string
    tipo: string
    descripcion: string
    fecha: string
    metodo: string
    subTipo: string
    monto: number
  }>
}

interface ColorMap {
  [key: string]: string
}

export default function DetalleClientePage() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id as string

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('datos')
  const [isMobile, setIsMobile] = useState(false)

  // Definir todas las funciones primero con useCallback
  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)

      // Cargar cliente
      const resCliente = await fetch(`/api/clientes/${clienteId}`)
      const dataCliente = await resCliente.json()
      if (dataCliente.success) {
        setCliente(dataCliente.cliente)
      }

      // Cargar estadísticas
      const resStats = await fetch(`/api/clientes/${clienteId}/estadisticas`)
      const dataStats = await resStats.json()
      if (dataStats.success) {
        setEstadisticas(dataStats.estadisticas)
      }

    } catch (error) {
      console.error('Error al cargar datos:', error)
      alert('❌ Error al cargar información del cliente')
    } finally {
      setLoading(false)
    }
  }, [clienteId])

  const cargarServicios = useCallback(async () => {
    try {
      const response = await fetch(`/api/clientes/${clienteId}/servicios`)
      const data = await response.json()
      if (data.success) {
        setServicios(data.servicios)
      }
    } catch (error) {
      console.error('Error al cargar servicios:', error)
    }
  }, [clienteId])

  const cargarVentas = useCallback(async () => {
    try {
      const response = await fetch(`/api/clientes/${clienteId}/ventas`)
      const data = await response.json()
      if (data.success) {
        setVentas(data.ventas)
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error)
    }
  }, [clienteId])

  const cargarEstadoCuenta = useCallback(async () => {
    try {
      const response = await fetch(`/api/clientes/${clienteId}/estado-cuenta`)
      const data = await response.json()
      if (data.success) {
        setEstadoCuenta(data.estadoCuenta)
      }
    } catch (error) {
      console.error('Error al cargar estado de cuenta:', error)
    }
  }, [clienteId])

  // Luego los useEffect
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (clienteId) {
      cargarDatos()
    }
  }, [clienteId, cargarDatos])

  useEffect(() => {
    if (activeTab === 'servicios' && servicios.length === 0) {
      cargarServicios()
    } else if (activeTab === 'compras' && ventas.length === 0) {
      cargarVentas()
    } else if (activeTab === 'cuenta' && !estadoCuenta) {
      cargarEstadoCuenta()
    }
  }, [activeTab, cargarServicios, cargarVentas, cargarEstadoCuenta, servicios.length, ventas.length, estadoCuenta])

  const formatearFecha = (fecha: string) => {
    if (!fecha) return 'N/A'
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const obtenerColorEstado = (estado: string) => {
    const colores: ColorMap = {
      'RECEPCIONADO': '#3b82f6',
      'EN_DIAGNOSTICO': '#f59e0b',
      'EN_REPARACION': '#8b5cf6',
      'ESPERANDO_REPUESTOS': '#ef4444',
      'REPARADO': '#10b981',
      'ENTREGADO': '#6b7280',
      'CANCELADO': '#dc2626'
    }
    return colores[estado] || '#6b7280'
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
        ⏳ Cargando información...
      </div>
    )
  }

  if (!cliente) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '1.25rem',
        color: '#ef4444'
      }}>
        ❌ Cliente no encontrado
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
          onClick={() => router.push('/dashboard/clientes')}
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
          ← Volver a Clientes
        </button>

       <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '1rem',
          width: '100%'
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 'bold',
              margin: '0 0 0.5rem 0'
            }}>
              👤 {cliente.nombre}
            </h1>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              fontSize: '0.95rem',
              color: '#6b7280'
            }}>
              <div>📄 {cliente.tipoDoc}: {cliente.numeroDoc}</div>
              {cliente.telefono && <div>📱 {cliente.telefono}</div>}
              {cliente.email && <div>📧 {cliente.email}</div>}
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            flexDirection: isMobile ? 'column' : 'row',
            width: isMobile ? '100%' : 'auto'
          }}>
            <button
              onClick={() => router.push(`/dashboard/clientes/${clienteId}/editar`)}
              style={{
                padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.875rem' : '0.95rem',
                fontWeight: '600',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              ✏️ Editar
            </button>
            <button
              onClick={() => router.push(`/dashboard/servicios/nuevo?clienteId=${clienteId}`)}
              style={{
                padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
                backgroundColor: '#22941eff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.875rem' : '0.95rem',
                fontWeight: '600',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              🔧 Nuevo Servicio
            </button>
            <button
              onClick={() => router.push(`/dashboard/ventas/nueva?clienteId=${clienteId}`)}
              style={{
               padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
                backgroundColor: '#1587d3ff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.875rem' : '0.95rem',
                fontWeight: '600',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              🛒 Nueva Venta
            </button>
          </div>
        </div>
      </div>

      {/* ESTADÍSTICAS RÁPIDAS */}
      {estadisticas && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: isMobile ? '0.75rem' : '1rem',
          marginBottom: '2rem'
        }}>

          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              fontSize: isMobile ? '0.7rem' : '0.875rem', 
              color: '#6b7280', 
              marginBottom: '0.5rem' 
            }}>
              Total Servicios
            </div>
            <div style={{ 
              fontSize: isMobile ? '1.5rem' : '1.75rem', 
              fontWeight: '700', 
              color: '#3b82f6' 
            }}>
              {estadisticas.totalServicios}
            </div>
            {estadisticas.serviciosActivos > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
                ⚡ {estadisticas.serviciosActivos} activos
              </div>
            )}
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div 
            style={{ fontSize: isMobile ? '0.7rem' : '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              Total Compras
            </div>
            <div 
            style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: '700', color: '#10b981' }}>
              {estadisticas.totalVentas}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div 
            style={{ fontSize: isMobile ? '0.7rem' : '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              Total Gastado
            </div>
            <div style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: '700', color: '#8b5cf6' }}>
              S/ {estadisticas.totalGastado.toFixed(2)}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: estadisticas.deudaTotal > 0 ? '2px solid #ef4444' : 'none'
          }}>
            <div style={{ fontSize: isMobile ? '0.7rem' : '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              Deuda Actual
            </div>
            <div style={{
              fontSize: isMobile ? '1.5rem' : '1.75rem',
              fontWeight: '700',
              color: estadisticas.deudaTotal > 0 ? '#ef4444' : '#10b981'
            }}>
              S/ {estadisticas.deudaTotal.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* TABS */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '2px solid #e5e7eb',
        marginBottom: '1.5rem',
        overflowX: 'auto'
      }}>
        {[
          { id: 'datos', label: '📋 Datos', icon: '📋' },
          { id: 'servicios', label: '🔧 Servicios', icon: '🔧' },
          { id: 'compras', label: '🛒 Compras', icon: '🛒' },
          { id: 'cuenta', label: '💰 Estado de Cuenta', icon: '💰' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
              fontSize: isMobile ? '1.5rem' : '1rem',
              fontWeight: '600',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              flex: isMobile ? '1' : 'initial'
            }}
          >
            {isMobile ? tab.label.split(' ')[0] : tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'datos' && (
        <div>
          {/* INFORMACIÓN GENERAL */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '2rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '0.5rem'
            }}>
              📋 INFORMACIÓN GENERAL
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Nombre Completo
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{cliente.nombre}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Documento
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  {cliente.tipoDoc}: {cliente.numeroDoc}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Teléfono
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  {cliente.telefono || 'No registrado'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Email
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  {cliente.email || 'No registrado'}
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Dirección
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  {cliente.direccion || 'No registrada'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Cliente desde
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  {formatearFecha(cliente.createdAt)}
                </div>
              </div>
              {estadisticas && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Última Visita
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                    {formatearFecha(estadisticas.ultimaVisita)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ESTADÍSTICAS DETALLADAS */}
          {estadisticas && (
            <div style={{
              backgroundColor: 'white',
              padding: isMobile ? '1rem' : '2rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #e5e7eb',
                paddingBottom: '0.5rem'
              }}>
                📊 ESTADÍSTICAS DETALLADAS
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem'
              }}>
                {/* Servicios Técnicos */}
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: '#dbeafe',
                  borderRadius: '8px',
                  border: '2px solid #3b82f6'
                }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1e40af',
                    marginBottom: '1rem'
                  }}>
                    🔧 SERVICIOS TÉCNICOS
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#1e40af' }}>Total servicios:</span>
                      <span style={{ fontWeight: '700', color: '#1e40af' }}>
                        {estadisticas.totalServicios}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#1e40af' }}>Activos:</span>
                      <span style={{ fontWeight: '700', color: '#10b981' }}>
                        {estadisticas.serviciosActivos}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#1e40af' }}>Total gastado:</span>
                      <span style={{ fontWeight: '700', color: '#1e40af' }}>
                        S/ {estadisticas.totalGastadoServicios.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#1e40af' }}>Deuda:</span>
                      <span style={{
                        fontWeight: '700',
                        color: estadisticas.deudaServicios > 0 ? '#ef4444' : '#10b981'
                      }}>
                        S/ {estadisticas.deudaServicios.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compras/Ventas */}
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: '#d1fae5',
                  borderRadius: '8px',
                  border: '2px solid #10b981'
                }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#065f46',
                    marginBottom: '1rem'
                  }}>
                    🛒 COMPRAS
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#065f46' }}>Total compras:</span>
                      <span style={{ fontWeight: '700', color: '#065f46' }}>
                        {estadisticas.totalVentas}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#065f46' }}>Total gastado:</span>
                      <span style={{ fontWeight: '700', color: '#065f46' }}>
                        S/ {estadisticas.totalGastadoVentas.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resumen General */}
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: '#fef3c7',
                  borderRadius: '8px',
                  border: '2px solid #f59e0b'
                }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#92400e',
                    marginBottom: '1rem'
                  }}>
                    💰 RESUMEN GENERAL
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#92400e' }}>Total gastado:</span>
                      <span style={{ fontWeight: '700', color: '#92400e' }}>
                        S/ {estadisticas.totalGastado.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#92400e' }}>Total pagado:</span>
                      <span style={{ fontWeight: '700', color: '#10b981' }}>
                        S/ {estadisticas.totalPagado.toFixed(2)}
                      </span>
                    </div>
                    <div style={{
                      borderTop: '1px solid #f59e0b',
                      paddingTop: '0.5rem',
                      marginTop: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ color: '#92400e', fontWeight: '700' }}>DEUDA TOTAL:</span>
                      <span style={{
                        fontWeight: '700',
                        fontSize: '1.1rem',
                        color: estadisticas.deudaTotal > 0 ? '#ef4444' : '#10b981'
                      }}>
                        S/ {estadisticas.deudaTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'servicios' && (
        <div>
          {servicios.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              padding: '3rem',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔧</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Sin servicios técnicos
              </div>
              <div style={{ fontSize: '0.95rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                Este cliente aún no tiene servicios registrados
              </div>
              <button
                onClick={() => router.push(`/dashboard/servicios/nuevo?clienteId=${clienteId}`)}
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
                🔧 Crear Primer Servicio
              </button>
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
                borderBottom: '2px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{ 
                  fontSize: isMobile ? '1.25rem' : '1.5rem', 
                  fontWeight: '600', 
                  margin: 0 
                }}>
                  🔧 Servicios Técnicos ({servicios.length})
                </h2>
              </div>

              {isMobile ? (
                // ==========================================
                // VISTA MÓVIL - CARDS
                // ==========================================
                <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
                  {servicios.map((servicio) => (
                    <div
                      key={servicio.id}
                      onClick={() => router.push(`/dashboard/servicios/${servicio.id}`)}
                      style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer'
                      }}
                    >
                      {/* Header - Número y Estado */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.75rem',
                        alignItems: 'flex-start',
                        gap: '0.5rem'
                      }}>
                        <span style={{ 
                          fontWeight: '700', 
                          fontSize: '1rem',
                          color: '#1f2937'
                        }}>
                          {servicio.numeroServicio}
                        </span>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          backgroundColor: obtenerColorEstado(servicio.estado) + '20',
                          color: obtenerColorEstado(servicio.estado),
                          whiteSpace: 'nowrap'
                        }}>
                          {servicio.estado.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Equipo */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ 
                          fontSize: '0.95rem', 
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '0.25rem'
                        }}>
                          {servicio.tipoEquipo}
                        </div>
                        {servicio.marcaModelo && (
                          <div style={{ 
                            color: '#6b7280', 
                            fontSize: '0.8rem' 
                          }}>
                            {servicio.marcaModelo}
                          </div>
                        )}
                      </div>

                      {/* Fecha */}
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#6b7280', 
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        📅 {formatearFecha(servicio.fecha)}
                      </div>

                      {/* Montos */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        <div>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Total
                          </div>
                          <div style={{ 
                            fontWeight: '700',
                            fontSize: '0.95rem',
                            color: '#1f2937'
                          }}>
                            S/ {Number(servicio.total).toFixed(2)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Saldo
                          </div>
                          <div style={{
                            fontWeight: '700',
                            fontSize: '0.95rem',
                            color: Number(servicio.saldo) > 0 ? '#ef4444' : '#10b981'
                          }}>
                            S/ {Number(servicio.saldo).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Indicador de tap */}
                      <div style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #e5e7eb',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        color: '#3b82f6',
                        fontWeight: '600'
                      }}>
                        👆 Toca para ver detalles
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // ==========================================
                // VISTA DESKTOP - TABLA
                // ==========================================
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Nº Servicio
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Fecha
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Equipo
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'center',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Estado
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Total
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Saldo
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'center',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicios.map((servicio, index) => (
                        <tr
                          key={servicio.id}
                          style={{
                            backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          <td style={{ padding: '1rem', fontWeight: '600' }}>
                            {servicio.numeroServicio}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                            {formatearFecha(servicio.fecha)}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: '600' }}>{servicio.tipoEquipo}</div>
                            {servicio.marcaModelo && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {servicio.marcaModelo}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: obtenerColorEstado(servicio.estado) + '20',
                              color: obtenerColorEstado(servicio.estado)
                            }}>
                              {servicio.estado.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                            S/ {Number(servicio.total).toFixed(2)}
                          </td>
                          <td style={{
                            padding: '1rem',
                            textAlign: 'right',
                            fontWeight: '600',
                            color: Number(servicio.saldo) > 0 ? '#ef4444' : '#10b981'
                          }}>
                            S/ {Number(servicio.saldo).toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <button
                              onClick={() => router.push(`/dashboard/servicios/${servicio.id}`)}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '600'
                              }}
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'compras' && (
        <div>
          {ventas.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              padding: '3rem',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Sin compras registradas
              </div>
              <div style={{ fontSize: '0.95rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                Este cliente aún no ha realizado compras
              </div>
              <button
                onClick={() => router.push(`/dashboard/ventas/nueva?clienteId=${clienteId}`)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                🛒 Registrar Primera Venta
              </button>
            </div>
          ) : (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '1.5rem',
                borderBottom: '2px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '600', margin: 0 }}>
                  🛒 Compras Realizadas ({ventas.length})
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {ventas.map((venta) => (
                    <div
                      key={venta.id}
                      style={{
                        padding: '1.5rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6'
                        e.currentTarget.style.backgroundColor = 'white'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb'
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }}
                      onClick={() => window.open(`/dashboard/ventas`, '_blank')}
                    >
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            marginBottom: '0.25rem'
                          }}>
                            {venta.numeroVenta}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {formatearFecha(venta.fecha)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                            Productos
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>
                            {venta.items} items
                          </div>
                          {venta.productosResumen && venta.productosResumen.length > 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              {venta.productosResumen.slice(0, 2).join(', ')}
                              {venta.masProductos && ` ${venta.masProductos}`}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                            Total
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981' }}>
                            S/ {venta.total.toFixed(2)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dashboard/ventas/${venta.id}`)
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '600'
                            }}
                          >
                            Ver Detalle
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'cuenta' && estadoCuenta && (
        <div>
          {/* RESUMEN */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '2rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '0.5rem'
            }}>
              💰 RESUMEN FINANCIERO
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem'
            }}>
              <div style={{
                padding: '1rem',
                backgroundColor: '#dbeafe',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.5rem' }}>
                  Total Servicios
                </div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '700', color: '#1e40af' }}>
                  S/ {estadoCuenta.resumen.totalServicios.toFixed(2)}
                </div>
              </div>
              <div style={{
                padding: '1rem',
                backgroundColor: '#d1fae5',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '0.5rem' }}>
                  Total Compras
                </div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '700', color: '#065f46' }}>
                  S/ {estadoCuenta.resumen.totalVentas.toFixed(2)}
                </div>
              </div>
              <div style={{
                padding: '1rem',
                backgroundColor: '#fef3c7',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '0.5rem' }}>
                  TOTAL GENERAL
                </div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '700', color: '#92400e' }}>
                  S/ {estadoCuenta.resumen.totalGeneral.toFixed(2)}
                </div>
              </div>
              <div style={{
                padding: '1rem',
                backgroundColor: '#dcfce7',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#166534', marginBottom: '0.5rem' }}>
                  Total Pagado
                </div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '700', color: '#166534' }}>
                  S/ {estadoCuenta.resumen.totalPagado.toFixed(2)}
                </div>
              </div>
              <div style={{
                padding: '1rem',
                backgroundColor: estadoCuenta.resumen.deudaTotal > 0 ? '#fee2e2' : '#dcfce7',
                borderRadius: '8px',
                border: estadoCuenta.resumen.deudaTotal > 0 ? '2px solid #ef4444' : 'none'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: estadoCuenta.resumen.deudaTotal > 0 ? '#991b1b' : '#166534',
                  marginBottom: '0.5rem'
                }}>
                  DEUDA PENDIENTE
                </div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  color: estadoCuenta.resumen.deudaTotal > 0 ? '#ef4444' : '#10b981'
                }}>
                  S/ {estadoCuenta.resumen.deudaTotal.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* PENDIENTES DE PAGO */}
          {estadoCuenta.pendientes && estadoCuenta.pendientes.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              padding: isMobile ? '1rem' : '2rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '1.5rem',
              border: '2px solid #ef4444'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                color: '#ef4444'
              }}>
                ⚠️ PENDIENTES DE PAGO
              </h2>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {estadoCuenta.pendientes?.map((pendiente) => (
                  <div
                    key={pendiente.referencia}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#fee2e2',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: '#991b1b' }}>
                        {pendiente.referencia}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>
                        {formatearFecha(pendiente.fecha)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>
                        Saldo:
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ef4444' }}>
                        S/ {pendiente.saldo.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HISTORIAL DE TRANSACCIONES */}
          {estadoCuenta.transacciones && estadoCuenta.transacciones.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              padding: isMobile ? '1rem' : '2rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #e5e7eb',
                paddingBottom: '0.5rem'
              }}>
                📋 HISTORIAL DE TRANSACCIONES
              </h2>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {estadoCuenta.transacciones?.map((transaccion) => (
                  <div
                    key={transaccion.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto auto',
                      gap: '1rem',
                      alignItems: 'center',
                      fontSize: '0.875rem'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: transaccion.tipo === 'SERVICIO' ? '#dbeafe' : '#d1fae5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem'
                    }}>
                      {transaccion.tipo === 'SERVICIO' ? '🔧' : '🛒'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600' }}>{transaccion.descripcion}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                        {formatearFecha(transaccion.fecha)} • {transaccion.metodo}
                      </div>
                    </div>
                    <div style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: transaccion.tipo === 'SERVICIO' ? '#dbeafe' : '#d1fae5',
                      color: transaccion.tipo === 'SERVICIO' ? '#1e40af' : '#065f46',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {transaccion.subTipo}
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '700',
                      color: '#10b981'
                    }}>
                      + S/ {transaccion.monto.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
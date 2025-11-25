"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Toast from "@/components/Toast"
import ModalAnularVenta from "@/components/ventas/ModalAnularVenta"

interface DetalleVenta {
  id: string
  productoId: string
  cantidad: number
  precioUnit: number
  producto: {
    id: string
    nombre: string
    codigo: string
    subcategoria: {
      nombre: string
      categoria: {
        nombre: string
      }
    }
  }
}

interface Venta {
  id: string
  numeroVenta: string
  fecha: string
  total: number
  estado: string
  motivoAnulacion: string | null
  servicio?: {
    numeroServicio: string
    tipoServicio: string
  } | null
  cliente: {
    id: string
    nombre: string
    numeroDoc: string
  }
  usuario: {
    id: string
    nombre: string
    username: string
  }
  sede: {
    id: string
    nombre: string
  }
  items: DetalleVenta[]
  pagos?: {
    id: string
    monto: number
    metodoPago: {
      id: string
      nombre: string
    }
  }[]
}

interface ToastState {
  mostrar: boolean
  mensaje: string
  tipo: 'success' | 'error' | 'warning' | 'info'
}

export default function VentasPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null)
  const [mostrarDetalle, setMostrarDetalle] = useState(false)
  const [mostrarModalAnular, setMostrarModalAnular] = useState(false)

  // ✅ NUEVOS FILTROS
  const [sedes, setSedes] = useState<any[]>([])
  const [sedeFiltro, setSedeFiltro] = useState('')
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
  const [fechaDesde, setFechaDesde] = useState(hoy) // ✅ Por defecto HOY
  const [fechaHasta, setFechaHasta] = useState(hoy) // ✅ Por defecto HOY
  const [esAdmin, setEsAdmin] = useState(false)
  const [mostrarAnuladas, setMostrarAnuladas] = useState(false)

  const [toast, setToast] = useState<ToastState>({
    mostrar: false,
    mensaje: '',
    tipo: 'info'
  })

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    cargarSedes()
    cargarVentas() // Cargar ventas al inicio con la fecha de hoy por defecto
    if (session?.user) {
      setEsAdmin(session.user.rol === 'admin')
    }
  }, [session])

  const mostrarToast = (mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ mostrar: true, mensaje, tipo })
  }

  const cargarSedes = async () => {
    try {
      const response = await fetch('/api/sedes')
      const data = await response.json()
      if (data.success) {
        setSedes(data.sedes || [])
      }
    } catch (error) {
      console.error('Error al cargar sedes:', error)
    }
  }

  const cargarVentas = async () => {
    try {
      const params = new URLSearchParams()

      // Usuario normal solo ve su sede
      if (session?.user?.rol === 'usuario' && session?.user?.sedeId) {
        params.append('sedeId', session.user.sedeId)
      } else if (sedeFiltro) {
        // Admin puede filtrar por sede
        params.append('sedeId', sedeFiltro)
      }

      // ✅ Filtros de fecha
      if (fechaDesde) params.append('fechaDesde', fechaDesde)
      if (fechaHasta) params.append('fechaHasta', fechaHasta)

      const response = await fetch(`/api/ventas?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setVentas(data.ventas)
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error)
      mostrarToast('Error al cargar las ventas', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleVerDetalle = (venta: Venta) => {
    setVentaSeleccionada(venta)
    setMostrarDetalle(true)
  }

  const handleAbrirModalAnular = () => {
    setMostrarDetalle(false)
    setMostrarModalAnular(true)
  }

  const handleVentaAnulada = () => {
    mostrarToast('Venta anulada correctamente', 'success')
    cargarVentas()
    setVentaSeleccionada(null)
  }

  // ✅ Filtrar según checkbox de anuladas
  const ventasFiltradas = ventas.filter(v => {
    // Filtrar por estado según checkbox
    if (mostrarAnuladas && v.estado !== 'ANULADA') return false
    if (!mostrarAnuladas && v.estado === 'ANULADA') return false

    const busquedaLower = busqueda.toLowerCase()
    return (
      v.cliente.nombre.toLowerCase().includes(busquedaLower) ||
      v.cliente.numeroDoc.toLowerCase().includes(busquedaLower) ||
      v.usuario.nombre.toLowerCase().includes(busquedaLower) ||
      v.sede.nombre.toLowerCase().includes(busquedaLower) ||
      (v.numeroVenta && v.numeroVenta.toLowerCase().includes(busquedaLower))
    )
  })

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calcularTotales = () => {
    const total = ventasFiltradas.reduce((sum, v) => sum + Number(v.total), 0)
    const promedio = ventasFiltradas.length > 0 ? total / ventasFiltradas.length : 0
    
    return {
      cantidad: ventasFiltradas.length,
      total,
      promedio
    }
  }

  const totales = calcularTotales()

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Cargando ventas...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '1rem' : '0' }}>
      {toast.mostrar && (
        <Toast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onClose={() => setToast({ ...toast, mostrar: false })}
        />
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        marginBottom: '1.5rem',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '1rem'
      }}>
        <div style={{ width: isMobile ? '100%' : 'auto' }}>
          <h1 style={{
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 'bold',
            margin: 0
          }}>
            🛒 Gestión de Ventas
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '0.5rem 0 0 0'
          }}>
            {totales.cantidad} venta{totales.cantidad !== 1 ? 's' : ''} {mostrarAnuladas ? 'anuladas' : 'activas'}
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard/ventas/nueva')}
          style={{
            padding: isMobile ? '0.75rem 1.5rem' : '0.75rem 2rem',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600',
            width: isMobile ? '100%' : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nueva Venta
        </button>
      </div>

      {/* ✅ FILTROS */}
      <div style={{
        backgroundColor: 'white',
        padding: isMobile ? '1rem' : '1.5rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {/* Filtro de Sede (solo para admin) */}
          {esAdmin && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                Sede
              </label>
              <select
                value={sedeFiltro}
                onChange={(e) => setSedeFiltro(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Todas las sedes</option>
                {sedes.map(sede => (
                  <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro Fecha Desde */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}>
              Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Filtro Fecha Hasta */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}>
              Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Checkbox Mostrar Anuladas */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              backgroundColor: mostrarAnuladas ? '#fee2e2' : '#f3f4f6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: mostrarAnuladas ? '#991b1b' : '#374151',
              border: mostrarAnuladas ? '2px solid #fca5a5' : '2px solid transparent',
              transition: 'all 0.2s',
              width: '100%',
              justifyContent: 'center'
            }}>
              <input
                type="checkbox"
                checked={mostrarAnuladas}
                onChange={(e) => setMostrarAnuladas(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              <span>{mostrarAnuladas ? '🗑️' : '✓'} {mostrarAnuladas ? 'Anuladas' : 'Activas'}</span>
            </label>
          </div>

          {/* Botón Buscar */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => {
                setLoading(true)
                cargarVentas()
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              🔍 Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Búsqueda */}
      <div style={{
        backgroundColor: 'white',
        padding: isMobile ? '1rem' : '1.5rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <input
          type="text"
          placeholder="Buscar por cliente, documento, vendedor o sede..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: '100%',
            padding: isMobile ? '0.875rem' : '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: isMobile ? '1rem' : '0.95rem'
          }}
        />
      </div>

      {/* Resumen de ventas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: '0 0 0.5rem 0',
                fontWeight: '600'
              }}>
                Total Ventas
              </p>
              <h3 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: mostrarAnuladas ? '#ef4444' : '#10b981',
                margin: 0
              }}>
                {totales.cantidad}
              </h3>
            </div>
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: mostrarAnuladas ? '#fee2e2' : '#d1fae5',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={mostrarAnuladas ? '#ef4444' : '#10b981'} strokeWidth="2">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: '0 0 0.5rem 0',
                fontWeight: '600'
              }}>
                Monto Total
              </p>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#3b82f6',
                margin: 0
              }}>
                S/ {totales.total.toFixed(2)}
              </h3>
            </div>
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#dbeafe',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: '0 0 0.5rem 0',
                fontWeight: '600'
              }}>
                Promedio Venta
              </p>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#f59e0b',
                margin: 0
              }}>
                S/ {totales.promedio.toFixed(2)}
              </h3>
            </div>
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#fef3c7',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de ventas */}
      {ventasFiltradas.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '2rem 1rem' : '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>
            {mostrarAnuladas ? '🗑️' : '🛒'}
          </p>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#374151',
            margin: '0 0 0.5rem 0'
          }}>
            No se encontraron ventas {mostrarAnuladas ? 'anuladas' : ''}
          </h2>
        </div>
      ) : isMobile ? (
        // Vista móvil - Cards
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {ventasFiltradas.map((venta) => (
            <div
              key={venta.id}
              style={{
                backgroundColor: 'white',
                padding: '1.25rem',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: `2px solid ${venta.estado === 'ANULADA' ? '#fecaca' : '#e5e7eb'}`,
                opacity: venta.estado === 'ANULADA' ? 0.7 : 1
              }}
            >
              <div style={{ marginBottom: '1rem' }}>
                {/* ✅ NUEVO: Badge de estado */}
                {venta.estado === 'ANULADA' && (
                  <div style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    marginBottom: '0.75rem'
                  }}>
                    ❌ ANULADA
                  </div>
                )}
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.75rem'
                }}>
                  <div>
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '0.25rem'
                    }}>
                      {venta.cliente.nombre}
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {venta.cliente.numeroDoc}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: venta.estado === 'ANULADA' ? '#ef4444' : '#10b981'
                  }}>
                    S/ {Number(venta.total).toFixed(2)}
                  </div>
                </div>

                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginBottom: '0.5rem'
                }}>
                  {formatearFecha(venta.fecha)}
                </div>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginTop: '0.75rem'
                }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af'
                  }}>
                    👤 {venta.usuario.nombre}
                  </span>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: '#f3f4f6',
                    color: '#374151'
                  }}>
                    🏢 {venta.sede.nombre}
                  </span>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: '#fef3c7',
                    color: '#92400e'
                  }}>
                    📦 {venta.items.length} producto{venta.items.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleVerDetalle(venta)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Ver Detalle
              </button>
            </div>
          ))}
        </div>
      ) : (
        // Vista escritorio - Tabla
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{
                  background: mostrarAnuladas
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white'
                }}>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                    Fecha
                  </th>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                    N° Venta
                  </th>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                    Cliente
                  </th>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                    Vendedor
                  </th>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                    Sede
                  </th>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>
                    Productos
                  </th>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'right', fontWeight: '600', fontSize: '0.875rem' }}>
                    Total
                  </th>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {ventasFiltradas.map((venta, index) => (
                  <tr
                    key={venta.id}
                    style={{ 
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: venta.estado === 'ANULADA' 
                        ? '#fef2f2' 
                        : index % 2 === 0 ? 'white' : '#f9fafb',
                      opacity: venta.estado === 'ANULADA' ? 0.7 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      if (venta.estado !== 'ANULADA') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (venta.estado !== 'ANULADA') {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f9fafb'
                      }
                    }}
                  >
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {new Date(venta.fecha).toLocaleDateString('es-PE')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                          {venta.numeroVenta}
                        </span>
                        {/* ✅ NUEVO: Badge de anulada */}
                        {venta.estado === 'ANULADA' && (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: '700'
                          }}>
                            ANULADA
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>
                        {venta.cliente.nombre}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {venta.cliente.numeroDoc}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {venta.usuario.nombre}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {venta.sede.nombre}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: '#fef3c7',
                        color: '#92400e'
                      }}>
                        {venta.items.length}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '1rem', 
                      textAlign: 'right', 
                      fontSize: '1rem', 
                      fontWeight: '700', 
                      color: venta.estado === 'ANULADA' ? '#ef4444' : '#10b981'
                    }}>
                      S/ {Number(venta.total).toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleVerDetalle(venta)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.4)'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Venta */}
      {mostrarDetalle && ventaSeleccionada && (
        <div
          onClick={() => setMostrarDetalle(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: isMobile ? '1rem' : '2rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{
              padding: isMobile ? '1.5rem' : '2rem',
              borderBottom: '1px solid #e5e7eb',
              background: ventaSeleccionada.estado === 'ANULADA'
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: 'bold',
                margin: '0 0 0.5rem 0'
              }}>
                Detalle de Venta - {ventaSeleccionada.numeroVenta}
                {ventaSeleccionada.estado === 'ANULADA' && (
                  <span style={{
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}>
                    ❌ ANULADA
                  </span>
                )}
                {ventaSeleccionada.servicio && (
                  <span style={{
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}>
                    {ventaSeleccionada.servicio.tipoServicio === 'DOMICILIO' ? '🏠' : '🔧'} Servicio
                  </span>
                )}
              </h2>
              <p style={{
                fontSize: '0.875rem',
                opacity: 0.9,
                margin: 0
              }}>
                {formatearFecha(ventaSeleccionada.fecha)}
              </p>
            </div>

            {/* ✅ NUEVO: Motivo de anulación (si está anulada) */}
            {ventaSeleccionada.estado === 'ANULADA' && ventaSeleccionada.motivoAnulacion && (
              <div style={{
                padding: isMobile ? '1.5rem' : '2rem',
                backgroundColor: '#fef2f2',
                borderBottom: '1px solid #fecaca'
              }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  color: '#dc2626',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem'
                }}>
                  Motivo de Anulación
                </h3>
                <p style={{
                  fontSize: '0.95rem',
                  color: '#991b1b',
                  margin: 0
                }}>
                  {ventaSeleccionada.motivoAnulacion}
                </p>
              </div>
            )}

            {/* Información general */}
            <div style={{ padding: isMobile ? '1.5rem' : '2rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>
                    Cliente
                  </label>
                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>
                      {ventaSeleccionada.cliente.nombre}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {ventaSeleccionada.cliente.numeroDoc}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>
                    Vendedor
                  </label>
                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    color: '#111827'
                  }}>
                    {ventaSeleccionada.usuario.nombre}
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>
                    Sede
                  </label>
                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    color: '#111827'
                  }}>
                    {ventaSeleccionada.sede.nombre}
                  </div>
                </div>

                {ventaSeleccionada.servicio && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.5rem'
                    }}>
                      Servicio Asociado
                    </label>
                    <div style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#eff6ff',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      color: '#111827',
                      fontWeight: '600'
                    }}>
                      {ventaSeleccionada.servicio.numeroServicio} {ventaSeleccionada.servicio.tipoServicio === 'DOMICILIO' ? '🏠' : '🔧'}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>
                    Total
                  </label>
                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: ventaSeleccionada.estado === 'ANULADA' ? '#fee2e2' : '#d1fae5',
                    borderRadius: '8px',
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: ventaSeleccionada.estado === 'ANULADA' ? '#991b1b' : '#065f46'
                  }}>
                    S/ {Number(ventaSeleccionada.total).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '1rem'
                }}>
                  Productos ({ventaSeleccionada.items?.length || 0})
                </h3>
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  {ventaSeleccionada.items.map((detalle, index) => (
                    <div
                      key={detalle.id}
                      style={{
                        padding: '1rem',
                        borderBottom: index < ventaSeleccionada.items.length - 1 ? '1px solid #e5e7eb' : 'none',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1rem'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            color: '#111827',
                            marginBottom: '0.25rem'
                          }}>
                            {detalle.producto.nombre}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>
                            {detalle.producto.subcategoria?.categoria?.nombre && detalle.producto.subcategoria?.nombre
                              ? `${detalle.producto.subcategoria.categoria.nombre} › ${detalle.producto.subcategoria.nombre} • `
                              : ''
                            }
                            Código: {detalle.producto.codigo}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            {detalle.cantidad} x S/ {Number(detalle.precioUnit).toFixed(2)}
                          </div>
                          <div style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            color: '#10b981'
                          }}>
                            S/ {(detalle.cantidad * Number(detalle.precioUnit)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ✅ Métodos de Pago */}
              {ventaSeleccionada.pagos && ventaSeleccionada.pagos.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '1rem'
                  }}>
                    Métodos de Pago ({ventaSeleccionada.pagos.length})
                  </h3>
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    {ventaSeleccionada.pagos.map((pago, index) => (
                      <div
                        key={pago.id}
                        style={{
                          padding: '1rem',
                          borderBottom: index < (ventaSeleccionada.pagos?.length || 0) - 1 ? '1px solid #e5e7eb' : 'none',
                          backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            color: '#111827'
                          }}>
                            {pago.metodoPago?.nombre || 'Método no especificado'}
                          </div>
                        </div>
                        <div style={{
                          fontSize: '1rem',
                          fontWeight: '700',
                          color: '#2563eb'
                        }}>
                          S/ {Number(pago.monto).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: isMobile ? '1.5rem' : '2rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-end',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <button
                onClick={() => window.open(`/comprobante/${ventaSeleccionada.id}`, '_blank')}
                style={{
                  padding: isMobile ? '0.875rem' : '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '1rem' : '0.95rem',
                  fontWeight: '600',
                  order: isMobile ? 1 : 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                🖨️ Imprimir Comprobante
              </button>
              {/* ✅ MODIFICADO: Solo mostrar botón de anular si NO está anulada */}
              {ventaSeleccionada.estado !== 'ANULADA' && (
                <button
                  onClick={handleAbrirModalAnular}
                  style={{
                    padding: isMobile ? '0.875rem' : '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '1rem' : '0.95rem',
                    fontWeight: '600',
                    order: isMobile ? 2 : 2
                  }}
                >
                  🗑️ Anular Venta
                </button>
              )}
              <button
                onClick={() => setMostrarDetalle(false)}
                style={{
                  padding: isMobile ? '0.875rem' : '0.75rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '1rem' : '0.95rem',
                  fontWeight: '600',
                  order: isMobile ? 3 : 1
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Anulación */}
      {mostrarModalAnular && ventaSeleccionada && (
        <ModalAnularVenta
          venta={{
            id: ventaSeleccionada.id,
            numeroVenta: ventaSeleccionada.numeroVenta,
            total: Number(ventaSeleccionada.total)
          }}
          onClose={() => setMostrarModalAnular(false)}
          onSuccess={handleVentaAnulada}
        />
      )}
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

interface Cliente {
  id: string
  nombre: string
  numeroDoc: string
  telefono: string | null
  email: string | null
  createdAt: string
  // Estadísticas calculadas
  totalServicios?: number
  serviciosActivos?: number
  totalVentas?: number
  deudaTotal?: number
}

export default function ClientesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [filtroActivo, setFiltroActivo] = useState("todos")
  const [hasSearched, setHasSearched] = useState(false)

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    filtrarClientes()
  }, [filtroActivo, clientes])

  const buscarClientes = async () => {
    // Validar que haya al menos 3 caracteres en la búsqueda
    if (busqueda.trim().length < 3) {
      alert('⚠️ Ingrese al menos 3 caracteres para buscar')
      return
    }

    try {
      setLoading(true)
      setHasSearched(true)
      const response = await fetch('/api/clientes?includeStats=true')
      const data = await response.json()

      if (data.success) {
        setClientes(data.clientes)
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error)
      alert('❌ Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  const limpiarBusqueda = () => {
    setBusqueda('')
    setClientes([])
    setClientesFiltrados([])
    setFiltroActivo('todos')
    setHasSearched(false)
  }

  const filtrarClientes = () => {
    let resultado = [...clientes]

    // Búsqueda
    if (busqueda.trim()) {
      const searchLower = busqueda.toLowerCase()
      resultado = resultado.filter(c => 
        c.nombre.toLowerCase().includes(searchLower) ||
        c.numeroDoc.includes(searchLower) ||
        c.telefono?.includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower)
      )
    }

    // Filtros
    if (filtroActivo === 'con-servicios') {
      resultado = resultado.filter(c => (c.serviciosActivos || 0) > 0)
    } else if (filtroActivo === 'con-deuda') {
      resultado = resultado.filter(c => (c.deudaTotal || 0) > 0)
    } else if (filtroActivo === 'sin-servicios') {
      resultado = resultado.filter(c => (c.totalServicios || 0) === 0)
    }

    setClientesFiltrados(resultado)
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div style={{ 
  maxWidth: '1400px', 
  margin: '0 auto', 
  padding: isMobile ? '0.5rem' : '1.5rem' 
}}>
      {/* HEADER */}
<div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '1rem',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          fontWeight: 'bold',
          margin: 0
        }}>
          👥 Clientes
        </h1>

        <button
          onClick={() => router.push('/dashboard/clientes/nuevo')}
          style={{
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            width: isMobile ? '100%' : 'auto',
            justifyContent: 'center'
          }}
        >
          ➕ Nuevo Cliente
        </button>
      </div>

      {/* ESTADÍSTICAS RÁPIDAS - Solo mostrar después de buscar */}
      {hasSearched && (
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
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>
              Total Clientes
            </div>
            <div style={{
              fontSize: isMobile ? '1.5rem' : '2rem',
              fontWeight: '700',
              color: '#3b82f6'
            }}>
              {clientes.length}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>
              Con Servicios Activos
            </div>
            <div style={{ fontSize: isMobile ? '1.5rem' : '2rem',
              fontWeight: '700', color: '#10b981' }}>
              {clientes.filter(c => (c.serviciosActivos || 0) > 0).length}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>
              Con Deuda Pendiente
            </div>
            <div style={{ fontSize: isMobile ? '1.5rem' : '2rem',
              fontWeight: '700', color: '#ef4444' }}>
              {clientes.filter(c => (c.deudaTotal || 0) > 0).length}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              Total Deuda
            </div>
            <div style={{ fontSize: isMobile ? '1.5rem' : '2rem',
              fontWeight: '700', color: '#ef4444' }}>
              S/ {clientes.reduce((sum, c) => sum + (c.deudaTotal || 0), 0).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* BÚSQUEDA Y FILTROS */}
<div style={{
        backgroundColor: 'white',
        padding: isMobile ? '1rem' : '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        {/* Búsqueda */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, DNI, teléfono o email (mínimo 3 caracteres)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  buscarClientes()
                }
              }}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
            <button
              onClick={buscarClientes}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}
            >
              {loading ? '⏳ Buscando...' : '🔍 Buscar'}
            </button>
            {hasSearched && (
              <button
                onClick={limpiarBusqueda}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
              >
                🗑️ Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'todos', label: '🌐 Todos', color: '#6b7280' },
            { id: 'con-servicios', label: '🔧 Con servicios activos', color: '#10b981' },
            { id: 'con-deuda', label: '💰 Con deuda', color: '#ef4444' },
            { id: 'sin-servicios', label: '🆕 Sin servicios', color: '#f59e0b' }
          ].map(filtro => (
            <button
              key={filtro.id}
              onClick={() => setFiltroActivo(filtro.id)}
              style={{
                padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
                backgroundColor: filtroActivo === filtro.id ? filtro.color : '#f3f4f6',
                color: filtroActivo === filtro.id ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {isMobile 
                ? filtro.label.split(' ')[0]  // Solo emoji en móvil
                : filtro.label
              }
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE CLIENTES */}
      {hasSearched && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Mostrando {clientesFiltrados.length} de {clientes.length} clientes
          </div>
        </div>
      )}

      {!hasSearched ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
            Buscar Clientes
          </div>
          <div style={{ fontSize: '0.95rem', color: '#6b7280' }}>
            Ingresa al menos 3 caracteres en el campo de búsqueda y presiona "Buscar" para encontrar clientes
          </div>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
            No se encontraron clientes
          </div>
          <div style={{ fontSize: '0.95rem', color: '#6b7280' }}>
            Intenta con otra búsqueda
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '1rem'
        }}>
          {clientesFiltrados.map((cliente) => (
            <div
              key={cliente.id}
              style={{
                backgroundColor: 'white',
                padding: isMobile ? '1rem' : '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '2px solid transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6'
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
              }}
              onClick={() => router.push(`/dashboard/clientes/${cliente.id}`)}
            >
             <div style={{
                display: isMobile ? 'flex' : 'grid',
                flexDirection: isMobile ? 'column' : undefined,
                gridTemplateColumns: isMobile ? undefined : 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: isMobile ? '1rem' : '1.5rem',
                alignItems: isMobile ? 'flex-start' : 'center'
              }}>
                {/* Info principal */}
                <div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '0.5rem'
                  }}>
                    👤 {cliente.nombre}
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    <div>📄 DNI: {cliente.numeroDoc}</div>
                    {cliente.telefono && <div>📱 {cliente.telefono}</div>}
                    {cliente.email && <div>📧 {cliente.email}</div>}
                  </div>
                </div>

                {/* Estadísticas */}
              <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: isMobile ? '0.5rem' : '0.75rem'
                }}>
                  <div style={{
                    padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                    backgroundColor: '#dbeafe',
                    borderRadius: '6px',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    fontWeight: '600',
                    color: '#1e40af'
                  }}>
                    🔧 {cliente.totalServicios || 0} servicios
                  </div>
                  <div style={{
                 padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                    backgroundColor: '#dbeafe',
                    borderRadius: '6px',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    fontWeight: '600',
                    color: '#065f46'
                  }}>
                    🛒 {cliente.totalVentas || 0} compras
                  </div>
                  {(cliente.serviciosActivos || 0) > 0 && (
                    <div style={{
                   padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                    backgroundColor: '#dbeafe',
                    borderRadius: '6px',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    fontWeight: '600',
                      color: '#92400e'
                    }}>
                      ⚡ {cliente.serviciosActivos} activos
                    </div>
                  )}
                  {(cliente.deudaTotal || 0) > 0 ? (
                    <div style={{
                  padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                    backgroundColor: '#dbeafe',
                    borderRadius: '6px',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    fontWeight: '600',
                      color: '#991b1b'
                    }}>
                      💰 Deuda: S/ {cliente.deudaTotal?.toFixed(2)}
                    </div>
                  ) : (
                    <div style={{
             padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                    backgroundColor: '#dbeafe',
                    borderRadius: '6px',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    fontWeight: '600',
                      color: '#065f46'
                    }}>
                      ✅ Sin deuda
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: '0.5rem',
                  justifyContent: 'flex-end',
                  width: isMobile ? '100%' : 'auto'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/dashboard/clientes/${cliente.id}`)
                    }}
                    style={{
                      padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      width: isMobile ? '100%' : 'auto'
                    }}
                  >
                    Ver Detalle
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/dashboard/servicios/nuevo?clienteId=${cliente.id}`)
                    }}
                    style={{
                      padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      width: isMobile ? '100%' : 'auto'
                    }}
                  >
                    🔧 Nuevo Servicio
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
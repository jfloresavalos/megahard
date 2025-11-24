"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import Toast from "@/components/Toast"

interface Sede {
  id: string
  nombre: string
  direccion: string | null
  telefono: string | null
  _count?: {
    productos: number
    usuarios: number
  }
}

interface ToastState {
  mostrar: boolean
  mensaje: string
  tipo: 'success' | 'error' | 'warning' | 'info'
}

export default function SedesPage() {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [mostrarModal, setMostrarModal] = useState(false)
  const [sedeSeleccionada, setSedeSeleccionada] = useState<Sede | null>(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [toast, setToast] = useState<ToastState>({
    mostrar: false,
    mensaje: '',
    tipo: 'info'
  })

  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: ''
  })

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const cargarSedes = useCallback(async () => {
    try {
      const response = await fetch('/api/sedes')
      const data = await response.json()
      if (data.success) {
        setSedes(data.sedes)
      }
    } catch (error) {
      console.error('Error al cargar sedes:', error)
      mostrarToast('Error al cargar las sedes', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarSedes()
  }, [cargarSedes])

  const mostrarToast = (mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ mostrar: true, mensaje, tipo })
  }

  const handleNuevaSede = () => {
    setSedeSeleccionada(null)
    setModoEdicion(false)
    setFormData({
      nombre: '',
      direccion: '',
      telefono: ''
    })
    setMostrarModal(true)
  }

  const handleEditarSede = (sede: Sede) => {
    setSedeSeleccionada(sede)
    setModoEdicion(true)
    setFormData({
      nombre: sede.nombre,
      direccion: sede.direccion || '',
      telefono: sede.telefono || ''
    })
    setMostrarModal(true)
  }

  const handleGuardar = async () => {
    if (!formData.nombre.trim()) {
      mostrarToast('El nombre es obligatorio', 'warning')
      return
    }

    setGuardando(true)

    try {
      const url = modoEdicion ? `/api/sedes/${sedeSeleccionada?.id}` : '/api/sedes'
      const method = modoEdicion ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        mostrarToast(
          modoEdicion ? 'Sede actualizada correctamente' : 'Sede creada correctamente',
          'success'
        )
        await cargarSedes()
        setMostrarModal(false)
      } else {
        mostrarToast(data.error || 'Error al guardar sede', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarToast('Error al guardar sede', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Está seguro de eliminar la sede "${nombre}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/sedes/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        mostrarToast('Sede eliminada correctamente', 'success')
        cargarSedes()
      } else {
        mostrarToast(data.error || 'Error al eliminar sede', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarToast('Error al eliminar sede', 'error')
    }
  }

  const sedesFiltradas = sedes.filter(s =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (s.direccion && s.direccion.toLowerCase().includes(busqueda.toLowerCase()))
  )

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Cargando sedes...</p>
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
          <button
            onClick={() => router.push('/dashboard/configuracion')}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ← Volver a Configuración
          </button>
<div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
  <div style={{
    width: '48px',
    height: '48px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
  }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  </div>
  <div>
    <h1 style={{
      fontSize: isMobile ? '1.5rem' : '2rem',
      fontWeight: 'bold',
      margin: 0,
      color: '#111827'
    }}>
      Gestión de Sedes
    </h1>
  </div>
</div>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '0.5rem 0 0 0'
          }}>
            {sedesFiltradas.length} sede{sedesFiltradas.length !== 1 ? 's' : ''} registrada{sedesFiltradas.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={handleNuevaSede}
          style={{
            padding: isMobile ? '0.75rem 1.5rem' : '0.75rem 2rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600',
            width: isMobile ? '100%' : 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          + Nueva Sede
        </button>
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
          placeholder="Buscar por nombre o dirección..."
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

      {/* Lista de sedes */}
      {sedesFiltradas.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '2rem 1rem' : '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>🏢</p>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#374151',
            margin: '0 0 0.5rem 0'
          }}>
            No se encontraron sedes
          </h2>
        </div>
      ) : isMobile ? (
        // Vista móvil - Cards
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sedesFiltradas.map((sede) => (
            <div
              key={sede.id}
              style={{
                backgroundColor: 'white',
                padding: '1.25rem',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {sede.nombre}
                </div>
                {sede.direccion && (
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    📍 {sede.direccion}
                  </div>
                )}
                {sede.telefono && (
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    📞 {sede.telefono}
                  </div>
                )}
              </div>

              {sede._count && (
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem', 
                  marginBottom: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af'
                  }}>
                    👥 {sede._count.usuarios} usuario{sede._count.usuarios !== 1 ? 's' : ''}
                  </span>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: '#fef3c7',
                    color: '#92400e'
                  }}>
                    📦 {sede._count.productos} producto{sede._count.productos !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleEditarSede(sede)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleEliminar(sede.id, sede.nombre)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Vista escritorio - Tabla
// Vista escritorio - Tabla
<div style={{
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden'
}}>
  <div style={{ overflowX: 'auto' }}>
    <table style={{
      width: '100%',
      borderCollapse: 'collapse'
    }}>
      <thead>
        <tr style={{ 
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white'
        }}>
          <th style={{ padding: '1.25rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
            Nombre
          </th>
          <th style={{ padding: '1.25rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
            Dirección
          </th>
          <th style={{ padding: '1.25rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
            Teléfono
          </th>
          <th style={{ padding: '1.25rem 1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>
            Usuarios
          </th>
          <th style={{ padding: '1.25rem 1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>
            Productos
          </th>
          <th style={{ padding: '1.25rem 1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>
            Acciones
          </th>
        </tr>
      </thead>
      <tbody>
        {sedesFiltradas.map((sede, index) => (
          <tr
            key={sede.id}
            style={{ 
              borderBottom: '1px solid #f3f4f6',
              backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
              e.currentTarget.style.transform = 'scale(1.01)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f9fafb'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <td style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  </svg>
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>
                  {sede.nombre}
                </span>
              </div>
            </td>
            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              {sede.direccion || '—'}
            </td>
            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              {sede.telefono || '—'}
            </td>
            <td style={{ padding: '1rem', textAlign: 'center' }}>
              <span style={{
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: '600',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
                {sede._count?.usuarios || 0}
              </span>
            </td>
            <td style={{ padding: '1rem', textAlign: 'center' }}>
              <span style={{
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: '600',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                {sede._count?.productos || 0}
              </span>
            </td>
            <td style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button
                  onClick={() => handleEditarSede(sede)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Editar
                </button>
                <button
                  onClick={() => handleEliminar(sede.id, sede.nombre)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.4)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Eliminar
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
      )}

      {/* Modal Crear/Editar Sede */}
      {mostrarModal && (
        <div
          onClick={() => !guardando && setMostrarModal(false)}
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
              borderRadius: '8px',
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {modoEdicion ? 'Editar Sede' : 'Nueva Sede'}
            </h2>

            {/* Nombre */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Nombre *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Sede Principal"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem'
                }}
              />
            </div>

            {/* Dirección */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Dirección
              </label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Ej: Av. Principal 123"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem'
                }}
              />
            </div>

            {/* Teléfono */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="Ej: 123-456-789"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem'
                }}
              />
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                onClick={() => setMostrarModal(false)}
                disabled={guardando}
                style={{
                  padding: isMobile ? '0.875rem' : '0.75rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  fontSize: isMobile ? '1rem' : '0.95rem',
                  fontWeight: '600',
                  order: isMobile ? 2 : 1
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                style={{
                  padding: isMobile ? '0.875rem' : '0.75rem 1.5rem',
                  backgroundColor: guardando ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  fontSize: isMobile ? '1rem' : '0.95rem',
                  fontWeight: '600',
                  order: isMobile ? 1 : 2
                }}
              >
                {guardando ? 'Guardando...' : modoEdicion ? '💾 Guardar Cambios' : '✓ Crear Sede'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
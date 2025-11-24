"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Toast from "@/components/Toast"

interface Usuario {
  id: string
  nombre: string
  username: string
  rol: string
  sedeId: string | null
  activo: boolean
  createdAt: string
  sede?: {
    id: string
    nombre: string
  } | null
}

interface Sede {
  id: string
  nombre: string
}

interface ToastState {
  mostrar: boolean
  mensaje: string
  tipo: 'success' | 'error' | 'warning' | 'info'
}

export default function UsuariosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [mostrarModal, setMostrarModal] = useState(false)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [toast, setToast] = useState<ToastState>({
    mostrar: false,
    mensaje: '',
    tipo: 'info'
  })

  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    password: '',
    rol: 'usuario',
    sedeId: ''
  })

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (session?.user?.rol !== 'admin') {
      router.push('/dashboard')
      return
    }
    cargarDatos()
  }, [session, router])

  const mostrarToast = (mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ mostrar: true, mensaje, tipo })
  }

  const cargarDatos = async () => {
    try {
      const resUsuarios = await fetch('/api/usuarios')
      const dataUsuarios = await resUsuarios.json()
      if (dataUsuarios.success) {
        setUsuarios(dataUsuarios.usuarios)
      }

      const resSedes = await fetch('/api/sedes')
      const dataSedes = await resSedes.json()
      if (dataSedes.success) {
        setSedes(dataSedes.sedes)
        if (dataSedes.sedes.length > 0) {
          setFormData(prev => ({ ...prev, sedeId: dataSedes.sedes[0].id }))
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
      mostrarToast('Error al cargar los datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleNuevoUsuario = () => {
    setUsuarioSeleccionado(null)
    setModoEdicion(false)
    setFormData({
      nombre: '',
      username: '',
      password: '',
      rol: 'usuario',
      sedeId: sedes[0]?.id || ''
    })
    setMostrarModal(true)
  }

  const handleEditarUsuario = (usuario: Usuario) => {
    setUsuarioSeleccionado(usuario)
    setModoEdicion(true)
    setFormData({
      nombre: usuario.nombre,
      username: usuario.username,
      password: '',
      rol: usuario.rol,
      sedeId: usuario.sedeId || (sedes[0]?.id || '')
    })
    setMostrarModal(true)
  }

  const handleGuardar = async () => {
    if (!formData.nombre || !formData.username) {
      mostrarToast('Por favor completa los campos obligatorios', 'warning')
      return
    }

    // Validar que si es usuario normal, debe tener sede
    if (formData.rol === 'usuario' && !formData.sedeId) {
      mostrarToast('Los usuarios normales deben tener una sede asignada', 'warning')
      return
    }

    if (!modoEdicion && !formData.password) {
      mostrarToast('La contraseña es obligatoria para nuevos usuarios', 'warning')
      return
    }

    setGuardando(true)

    try {
      const url = modoEdicion ? `/api/usuarios/${usuarioSeleccionado?.id}` : '/api/usuarios'
      const method = modoEdicion ? 'PUT' : 'POST'

      const body: any = {
        nombre: formData.nombre,
        username: formData.username,
        rol: formData.rol,
        sedeId: formData.rol === 'admin' ? null : formData.sedeId
      }

      if (formData.password) {
        body.password = formData.password
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (data.success) {
        mostrarToast(
          modoEdicion ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente',
          'success'
        )
        await cargarDatos()
        setMostrarModal(false)
      } else {
        mostrarToast(data.error || 'Error al guardar usuario', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarToast('Error al guardar usuario', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const handleCambiarEstado = async (id: string, nombre: string, activo: boolean) => {
    const accion = activo ? 'desactivar' : 'activar'
    if (!confirm(`¿Está seguro de ${accion} al usuario "${nombre}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        mostrarToast(data.message, 'success')
        cargarDatos()
      } else {
        mostrarToast(data.error || `Error al ${accion} usuario`, 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarToast(`Error al ${accion} usuario`, 'error')
    }
  }

  const usuariosFiltrados = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.username.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (session?.user?.rol !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Cargando usuarios...</p>
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
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
  }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  </div>
  <div>
    <h1 style={{
      fontSize: isMobile ? '1.5rem' : '2rem',
      fontWeight: 'bold',
      margin: 0,
      color: '#111827'
    }}>
      Gestión de Usuarios
    </h1>
  </div>
</div>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '0.5rem 0 0 0'
          }}>
            {usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''} encontrado{usuariosFiltrados.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={handleNuevoUsuario}
          style={{
            padding: isMobile ? '0.75rem 1.5rem' : '0.75rem 2rem',
            backgroundColor: '#2563eb',
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
          + Nuevo Usuario
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
          placeholder="Buscar por nombre o usuario..."
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

      {/* Lista de usuarios */}
      {usuariosFiltrados.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '2rem 1rem' : '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>👥</p>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#374151',
            margin: '0 0 0.5rem 0'
          }}>
            No se encontraron usuarios
          </h2>
        </div>
      ) : isMobile ? (
        // Vista móvil - Cards
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {usuariosFiltrados.map((usuario) => (
            <div
              key={usuario.id}
              style={{
                backgroundColor: 'white',
                padding: '1.25rem',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  {usuario.nombre}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  @{usuario.username}
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                marginBottom: '1rem',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: usuario.rol === 'admin' ? '#dbeafe' : '#f3f4f6',
                  color: usuario.rol === 'admin' ? '#1e40af' : '#374151'
                }}>
                  {usuario.rol === 'admin' ? '👑 Admin' : '👤 Usuario'}
                </span>

                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: usuario.activo ? '#d1fae5' : '#fee2e2',
                  color: usuario.activo ? '#065f46' : '#991b1b'
                }}>
                  {usuario.activo ? '✓ Activo' : '✗ Inactivo'}
                </span>
              </div>

              {usuario.sede && (
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: '#6b7280',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>🏢</span>
                  <span>{usuario.sede.nombre}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleEditarUsuario(usuario)}
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
                  onClick={() => handleCambiarEstado(usuario.id, usuario.nombre, usuario.activo)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: usuario.activo ? '#ef4444' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  {usuario.activo ? '🚫 Desactivar' : '✓ Activar'}
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <th style={{ padding: '1.25rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
            Nombre
          </th>
          <th style={{ padding: '1.25rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
            Usuario
          </th>
          <th style={{ padding: '1.25rem 1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>
            Rol
          </th>
          <th style={{ padding: '1.25rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
            Sede
          </th>
          <th style={{ padding: '1.25rem 1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>
            Estado
          </th>
          <th style={{ padding: '1.25rem 1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>
            Acciones
          </th>
        </tr>
      </thead>
      <tbody>
        {usuariosFiltrados.map((usuario, index) => (
          <tr
            key={usuario.id}
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
            <td style={{ padding: '1rem', fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '1rem'
                }}>
                  {usuario.nombre.charAt(0).toUpperCase()}
                </div>
                <span>{usuario.nombre}</span>
              </div>
            </td>
            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              @{usuario.username}
            </td>
            <td style={{ padding: '1rem', textAlign: 'center' }}>
              <span style={{
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: '600',
                backgroundColor: usuario.rol === 'admin' ? '#dbeafe' : '#f3f4f6',
                color: usuario.rol === 'admin' ? '#1e40af' : '#374151',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {usuario.rol === 'admin' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                )}
                {usuario.rol === 'admin' ? 'Admin' : 'Usuario'}
              </span>
            </td>
            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              {usuario.sede?.nombre || '—'}
            </td>
            <td style={{ padding: '1rem', textAlign: 'center' }}>
              <span style={{
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: '600',
                backgroundColor: usuario.activo ? '#d1fae5' : '#fee2e2',
                color: usuario.activo ? '#065f46' : '#991b1b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: usuario.activo ? '#10b981' : '#ef4444'
                }}></div>
                {usuario.activo ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button
                  onClick={() => handleEditarUsuario(usuario)}
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
                  onClick={() => handleCambiarEstado(usuario.id, usuario.nombre, usuario.activo)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: usuario.activo 
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
                    boxShadow: usuario.activo 
                      ? '0 2px 4px rgba(239, 68, 68, 0.3)'
                      : '0 2px 4px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = usuario.activo
                      ? '0 4px 8px rgba(239, 68, 68, 0.4)'
                      : '0 4px 8px rgba(16, 185, 129, 0.4)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = usuario.activo
                      ? '0 2px 4px rgba(239, 68, 68, 0.3)'
                      : '0 2px 4px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {usuario.activo ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                      Desactivar
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      Activar
                    </>
                  )}
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

      {/* Modal Crear/Editar Usuario */}
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
              {modoEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>

            {/* Nombre */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Nombre completo *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Juan Pérez"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem'
                }}
              />
            </div>

            {/* Username */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Nombre de usuario *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Ej: jperez"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem'
                }}
              />
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Contraseña {modoEdicion ? '(dejar en blanco para no cambiar)' : '*'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={modoEdicion ? 'Nueva contraseña' : 'Contraseña'}
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem'
                }}
              />
            </div>
{/* Rol */}
<div style={{ marginBottom: '1rem' }}>
  <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
    Rol *
  </label>
  <select
    value={formData.rol}
    onChange={(e) => {
      const nuevoRol = e.target.value
      setFormData({ 
        ...formData, 
        rol: nuevoRol,
        // Si cambia a admin, limpiar la sede
        sedeId: nuevoRol === 'admin' ? '' : formData.sedeId || (sedes[0]?.id || '')
      })
    }}
    style={{
      width: '100%',
      padding: isMobile ? '0.875rem' : '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: isMobile ? '1rem' : '0.95rem',
      backgroundColor: 'white',
      cursor: 'pointer'
    }}
  >
    <option value="usuario">Usuario</option>
    <option value="admin">Administrador</option>
  </select>
</div>

            {/* Sede - Solo si es usuario normal */}
            {formData.rol === 'usuario' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Sede *
                </label>
                <select
                  value={formData.sedeId}
                  onChange={(e) => setFormData({ ...formData, sedeId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: isMobile ? '0.875rem' : '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: isMobile ? '1rem' : '0.95rem',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {sedes.map(sede => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.rol === 'admin' && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#dbeafe',
                borderRadius: '6px',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                color: '#1e40af'
              }}>
                ℹ️ Los administradores no necesitan una sede asignada
              </div>
            )}

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
                {guardando ? 'Guardando...' : modoEdicion ? '💾 Guardar Cambios' : '✓ Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
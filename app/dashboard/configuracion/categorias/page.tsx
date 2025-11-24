"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import Toast from "@/components/Toast"

interface Subcategoria {
  id: string
  nombre: string
  categoriaId: string
  _count?: {
    productos: number
  }
}

interface Categoria {
  id: string
  nombre: string
  subcategorias: Subcategoria[]
}

interface ToastState {
  mostrar: boolean
  mensaje: string
  tipo: 'success' | 'error' | 'warning' | 'info'
}

export default function CategoriasPage() {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [categoriaExpandida, setCategoriaExpandida] = useState<string | null>(null)
  
  // Modales
  const [mostrarModalCategoria, setMostrarModalCategoria] = useState(false)
  const [mostrarModalSubcategoria, setMostrarModalSubcategoria] = useState(false)
  
  // Estados de edición
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<Categoria | null>(null)
  const [subcategoriaSeleccionada, setSubcategoriaSeleccionada] = useState<Subcategoria | null>(null)
  const [modoEdicionCategoria, setModoEdicionCategoria] = useState(false)
  const [modoEdicionSubcategoria, setModoEdicionSubcategoria] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [toast, setToast] = useState<ToastState>({
    mostrar: false,
    mensaje: '',
    tipo: 'info'
  })

  const [formCategoria, setFormCategoria] = useState({
    nombre: ''
  })

  const [formSubcategoria, setFormSubcategoria] = useState({
    nombre: '',
    categoriaId: ''
  })

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const cargarCategorias = useCallback(async () => {
    try {
      const response = await fetch('/api/categorias')
      const data = await response.json()
      if (data.success) {
        setCategorias(data.categorias)
        // Expandir la primera categoría por defecto
        if (data.categorias.length > 0) {
          setCategoriaExpandida(data.categorias[0].id)
        }
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error)
      mostrarToast('Error al cargar las categorías', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarCategorias()
  }, [cargarCategorias])

  const mostrarToast = (mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ mostrar: true, mensaje, tipo })
  }

  // Funciones de Categoría
  const handleNuevaCategoria = () => {
    setCategoriaSeleccionada(null)
    setModoEdicionCategoria(false)
    setFormCategoria({ nombre: '' })
    setMostrarModalCategoria(true)
  }

  const handleEditarCategoria = (categoria: Categoria) => {
    setCategoriaSeleccionada(categoria)
    setModoEdicionCategoria(true)
    setFormCategoria({ nombre: categoria.nombre })
    setMostrarModalCategoria(true)
  }

  const handleGuardarCategoria = async () => {
    if (!formCategoria.nombre.trim()) {
      mostrarToast('El nombre es obligatorio', 'warning')
      return
    }

    setGuardando(true)

    try {
      const url = modoEdicionCategoria ? `/api/categorias/${categoriaSeleccionada?.id}` : '/api/categorias'
      const method = modoEdicionCategoria ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCategoria)
      })

      const data = await response.json()

      if (data.success) {
        mostrarToast(
          modoEdicionCategoria ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente',
          'success'
        )
        await cargarCategorias()
        setMostrarModalCategoria(false)
      } else {
        mostrarToast(data.error || 'Error al guardar categoría', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarToast('Error al guardar categoría', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminarCategoria = async (id: string, nombre: string) => {
    if (!confirm(`¿Está seguro de eliminar la categoría "${nombre}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/categorias/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        mostrarToast('Categoría eliminada correctamente', 'success')
        cargarCategorias()
      } else {
        mostrarToast(data.error || 'Error al eliminar categoría', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarToast('Error al eliminar categoría', 'error')
    }
  }

  // Funciones de Subcategoría
  const handleNuevaSubcategoria = (categoriaId: string) => {
    setSubcategoriaSeleccionada(null)
    setModoEdicionSubcategoria(false)
    setFormSubcategoria({ nombre: '', categoriaId })
    setMostrarModalSubcategoria(true)
  }

  const handleEditarSubcategoria = (subcategoria: Subcategoria) => {
    setSubcategoriaSeleccionada(subcategoria)
    setModoEdicionSubcategoria(true)
    setFormSubcategoria({ 
      nombre: subcategoria.nombre,
      categoriaId: subcategoria.categoriaId
    })
    setMostrarModalSubcategoria(true)
  }

  const handleGuardarSubcategoria = async () => {
    if (!formSubcategoria.nombre.trim()) {
      mostrarToast('El nombre es obligatorio', 'warning')
      return
    }

    setGuardando(true)

    try {
      const url = modoEdicionSubcategoria 
        ? `/api/subcategorias/${subcategoriaSeleccionada?.id}` 
        : `/api/categorias/${formSubcategoria.categoriaId}/subcategorias`
      const method = modoEdicionSubcategoria ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: formSubcategoria.nombre })
      })

      const data = await response.json()

      if (data.success) {
        mostrarToast(
          modoEdicionSubcategoria ? 'Subcategoría actualizada correctamente' : 'Subcategoría creada correctamente',
          'success'
        )
        await cargarCategorias()
        setMostrarModalSubcategoria(false)
      } else {
        mostrarToast(data.error || 'Error al guardar subcategoría', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarToast('Error al guardar subcategoría', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminarSubcategoria = async (id: string, nombre: string) => {
    if (!confirm(`¿Está seguro de eliminar la subcategoría "${nombre}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/subcategorias/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        mostrarToast('Subcategoría eliminada correctamente', 'success')
        cargarCategorias()
      } else {
        mostrarToast(data.error || 'Error al eliminar subcategoría', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarToast('Error al eliminar subcategoría', 'error')
    }
  }

  const categoriasFiltradas = categorias.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.subcategorias.some(s => s.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  )

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Cargando categorías...</p>
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
          <h1 style={{
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 'bold',
            margin: 0
          }}>
            📦 Categorías y Subcategorías
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '0.5rem 0 0 0'
          }}>
            {categoriasFiltradas.length} categoría{categoriasFiltradas.length !== 1 ? 's' : ''} • {categoriasFiltradas.reduce((acc, c) => acc + c.subcategorias.length, 0)} subcategorías
          </p>
        </div>

        <button
          onClick={handleNuevaCategoria}
          style={{
            padding: isMobile ? '0.75rem 1.5rem' : '0.75rem 2rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nueva Categoría
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
          placeholder="Buscar categorías o subcategorías..."
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

      {/* Layout de 2 columnas */}
      {categoriasFiltradas.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '2rem 1rem' : '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>📦</p>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#374151',
            margin: '0 0 0.5rem 0'
          }}>
            No se encontraron categorías
          </h2>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '320px 1fr',
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          {/* Columna izquierda - Lista de categorías */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            height: isMobile ? 'auto' : 'calc(100vh - 250px)',
            position: isMobile ? 'relative' : 'sticky',
            top: isMobile ? 0 : '20px'
          }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0
              }}>
                Categorías ({categoriasFiltradas.length})
              </h3>
            </div>
            <div style={{
              maxHeight: isMobile ? '400px' : 'calc(100vh - 350px)',
              overflowY: 'auto'
            }}>
              {categoriasFiltradas.map((categoria, index) => (
                <div
                  key={categoria.id}
                  onClick={() => setCategoriaExpandida(categoria.id)}
                  style={{
                    padding: '1rem 1.25rem',
                    borderBottom: index < categoriasFiltradas.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: 'pointer',
                    backgroundColor: categoriaExpandida === categoria.id ? '#f0f9ff' : 'white',
                    borderLeft: categoriaExpandida === categoria.id ? '3px solid #3b82f6' : '3px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (categoriaExpandida !== categoria.id) {
                      e.currentTarget.style.backgroundColor = '#f9fafb'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (categoriaExpandida !== categoria.id) {
                      e.currentTarget.style.backgroundColor = 'white'
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '0.25rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {categoria.nombre}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        {categoria.subcategorias.length} subcategoría{categoria.subcategorias.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke={categoriaExpandida === categoria.id ? '#3b82f6' : '#9ca3af'}
                      strokeWidth="2"
                      style={{
                        transform: categoriaExpandida === categoria.id ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0
                      }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Columna derecha - Detalles de categoría seleccionada */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {categoriaExpandida ? (() => {
              const categoria = categoriasFiltradas.find(c => c.id === categoriaExpandida)
              if (!categoria) return null

              return (
                <>
                  {/* Header de la categoría */}
                  <div style={{
                    padding: isMobile ? '1.5rem' : '2rem',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <h2 style={{
                          fontSize: isMobile ? '1.5rem' : '1.75rem',
                          fontWeight: '700',
                          color: '#111827',
                          margin: '0 0 0.5rem 0'
                        }}>
                          {categoria.nombre}
                        </h2>
                        <p style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          margin: 0
                        }}>
                          {categoria.subcategorias.length} subcategoría{categoria.subcategorias.length !== 1 ? 's' : ''} registrada{categoria.subcategorias.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                      }}>
                        <button
                          onClick={() => handleNuevaSubcategoria(categoria.id)}
                          style={{
                            padding: '0.625rem 1rem',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          Subcategoría
                        </button>
                        <button
                          onClick={() => handleEditarCategoria(categoria)}
                          style={{
                            padding: '0.625rem 1rem',
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
                            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => handleEliminarCategoria(categoria.id, categoria.nombre)}
                          style={{
                            padding: '0.625rem 1rem',
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
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lista de subcategorías */}
                  {categoria.subcategorias.length === 0 ? (
                    <div style={{
                      padding: isMobile ? '3rem 1rem' : '4rem',
                      textAlign: 'center',
                      color: '#9ca3af'
                    }}>
                      <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 1.5rem',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7"></rect>
                          <rect x="14" y="3" width="7" height="7"></rect>
                          <rect x="14" y="14" width="7" height="7"></rect>
                          <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                      </div>
                      <p style={{ fontSize: '1rem', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
                        No hay subcategorías
                      </p>
                      <p style={{ fontSize: '0.875rem', margin: 0 }}>
                        Crea la primera subcategoría para esta categoría
                      </p>
                    </div>
                  ) : (
                    <div style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '1rem'
                      }}>
                        {categoria.subcategorias.map((subcategoria) => (
                          <div
                            key={subcategoria.id}
                            style={{
                              padding: '1.25rem',
                              backgroundColor: '#ffffff',
                              border: '2px solid #e5e7eb',
                              borderRadius: '10px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.borderColor = '#3b82f6'
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)'
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.borderColor = '#e5e7eb'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '1rem'
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{
                                  fontSize: '1rem',
                                  fontWeight: '600',
                                  color: '#111827',
                                  margin: '0 0 0.5rem 0',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {subcategoria.nombre}
                                </h3>
                                {subcategoria._count && (
                                  <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.75rem',
                                    backgroundColor: '#f3f4f6',
                                    color: '#6b7280',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                  }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                    </svg>
                                    {subcategoria._count.productos}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleEditarSubcategoria(subcategoria)}
                                style={{
                                  flex: 1,
                                  padding: '0.625rem',
                                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)'
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)'
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)'
                                  e.currentTarget.style.boxShadow = 'none'
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Editar
                              </button>
                              <button
                                onClick={() => handleEliminarSubcategoria(subcategoria.id, subcategoria.nombre)}
                                style={{
                                  flex: 1,
                                  padding: '0.625rem',
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)'
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)'
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)'
                                  e.currentTarget.style.boxShadow = 'none'
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Eliminar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })() : (
              <div style={{
                padding: isMobile ? '3rem 1rem' : '4rem',
                textAlign: 'center',
                color: '#9ca3af'
              }}>
                <p>Selecciona una categoría para ver sus detalles</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Crear/Editar Categoría */}
      {mostrarModalCategoria && (
        <div
          onClick={() => !guardando && setMostrarModalCategoria(false)}
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
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '500px',
              width: '100%'
            }}
          >
            <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {modoEdicionCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Nombre *
              </label>
              <input
                type="text"
                value={formCategoria.nombre}
                onChange={(e) => setFormCategoria({ nombre: e.target.value })}
                placeholder="Ej: Computadoras"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                onClick={() => setMostrarModalCategoria(false)}
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
                onClick={handleGuardarCategoria}
                disabled={guardando}
                style={{
                  padding: isMobile ? '0.875rem' : '0.75rem 1.5rem',
                  backgroundColor: guardando ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  fontSize: isMobile ? '1rem' : '0.95rem',
                  fontWeight: '600',
                  order: isMobile ? 1 : 2
                }}
              >
                {guardando ? 'Guardando...' : modoEdicionCategoria ? '💾 Guardar' : '✓ Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar Subcategoría */}
      {mostrarModalSubcategoria && (
        <div
          onClick={() => !guardando && setMostrarModalSubcategoria(false)}
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
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '500px',
              width: '100%'
            }}
          >
            <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {modoEdicionSubcategoria ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
            </h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Nombre *
              </label>
              <input
                type="text"
                value={formSubcategoria.nombre}
                onChange={(e) => setFormSubcategoria({ ...formSubcategoria, nombre: e.target.value })}
                placeholder="Ej: Laptop"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                onClick={() => setMostrarModalSubcategoria(false)}
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
                onClick={handleGuardarSubcategoria}
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
                {guardando ? 'Guardando...' : modoEdicionSubcategoria ? '💾 Guardar' : '✓ Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
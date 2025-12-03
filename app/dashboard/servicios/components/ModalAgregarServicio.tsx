"use client"

import { useState } from 'react'

interface Servicio {
  id: string
  nombre: string
  descripcion?: string | null
  precioSugerido: number
}

interface ModalAgregarServicioProps {
  isOpen: boolean
  onClose: () => void
  servicios: Servicio[]
  onSeleccionar: (servicio: Servicio) => void
  onCrearNuevo: () => void
  onEditar?: (servicio: Servicio) => void
  onEliminar?: (servicioId: string) => void
}

export default function ModalAgregarServicio({
  isOpen,
  onClose,
  servicios,
  onSeleccionar,
  onCrearNuevo,
  onEditar,
  onEliminar
}: ModalAgregarServicioProps) {
  const [busqueda, setBusqueda] = useState('')

  if (!isOpen) return null

  const serviciosFiltrados = servicios.filter(s =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const MAX_RESULTADOS = 15
  const serviciosAMostrar = serviciosFiltrados.slice(0, MAX_RESULTADOS)
  const hayMas = serviciosFiltrados.length > MAX_RESULTADOS

  const handleSeleccionar = (servicio: Servicio) => {
    onSeleccionar(servicio)
    setBusqueda('')
  }

  return (
    <div
      onClick={onClose}
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
        padding: '1rem'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
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
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            margin: 0,
            color: '#111827'
          }}>
            💰 Agregar Servicio Adicional
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '2rem',
              color: '#6b7280',
              cursor: 'pointer',
              padding: 0,
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* BUSCADOR */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar servicio..."
            autoFocus
            style={{
              width: '100%',
              padding: '1rem',
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
            onBlur={(e) => e.target.style.borderColor = '#3b82f6'}
          />
          <div style={{
            marginTop: '0.5rem',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            {serviciosFiltrados.length} resultado(s) encontrado(s)
          </div>
        </div>

        {/* LISTA DE RESULTADOS */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem'
        }}>
          {serviciosAMostrar.length === 0 ? (
            <div style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              color: '#9ca3af'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <p style={{ margin: 0, fontSize: '1rem' }}>
                {busqueda ? 'No se encontraron resultados' : 'Escribe para buscar servicios'}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {serviciosAMostrar.map((servicio) => (
                <div
                  key={servicio.id}
                  style={{
                    padding: '1rem 1.25rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    backgroundColor: 'white',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6'
                    e.currentTarget.style.backgroundColor = '#eff6ff'
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div
                    onClick={() => handleSeleccionar(servicio)}
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      marginBottom: servicio.descripcion ? '0.5rem' : 0
                    }}>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#111827',
                        flex: 1
                      }}>
                        {servicio.nombre}
                      </div>
                      <div style={{
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: '#10b981',
                        whiteSpace: 'nowrap'
                      }}>
                        S/ {Number(servicio.precioSugerido).toFixed(2)}
                      </div>
                    </div>
                    {servicio.descripcion && (
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        lineHeight: '1.4'
                      }}>
                        {servicio.descripcion}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {onEditar && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditar(servicio)
                        }}
                        title="Editar servicio"
                        style={{
                          padding: '0.25rem 0.4rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                      >
                        ✏️
                      </button>
                    )}
                    {onEliminar && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`¿Eliminar servicio "${servicio.nombre}"?`)) {
                            onEliminar(servicio.id)
                          }
                        }}
                        title="Eliminar servicio"
                        style={{
                          padding: '0.25rem 0.4rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {hayMas && (
                <div style={{
                  padding: '1rem',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  fontStyle: 'italic',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px'
                }}>
                  + {serviciosFiltrados.length - MAX_RESULTADOS} servicio(s) más...
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Refina tu búsqueda para ver más
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER CON BOTÓN CREAR NUEVO */}
        <div style={{
          padding: '1.5rem',
          borderTop: '2px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <button
            onClick={() => {
              onCrearNuevo()
              onClose()
            }}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Crear Servicio Nuevo
          </button>
        </div>
      </div>
    </div>
  )
}